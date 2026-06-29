import { useState, useEffect, useRef } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import { getAirportCity, getAirportCountry } from '../data/airportsData'
import type { EnvioEstado } from '../types'

type Tab = 'pendientes' | 'planificados' | 'envuelo' | 'entregados'
type SearchScope = 'todos' | 'id' | 'origen' | 'destino'
type FilterScope = 'directo' | 'ruta'
type FilterMatchBy = 'codigo' | 'ciudad' | 'pais'

const TAB_CONFIG: { key: Tab; label: string; estados: string; horas?: number }[] = [
  { key: 'envuelo', label: 'En vuelo', estados: 'EN_VUELO' },
  { key: 'planificados', label: 'Planificados', estados: 'EMBARCADO' },
  { key: 'pendientes', label: 'Pendientes', estados: 'EN_ESPERA' },
  { key: 'entregados', label: 'Entregados', estados: 'ENTREGADO', horas: 4 },
]

function countByEstado(envios: EnvioEstado[], estado: string): number {
  return envios.filter(e => e.estado === estado).length
}

interface Props {
  onEnvioSelect: (envio: EnvioEstado) => void
  selectedEnvioId?: string | null
  enviosExternos?: EnvioEstado[]
  currentTime?: string | null
}

const DEFAULT_LIMIT = 50

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function airportFieldValue(code: string, matchBy: FilterMatchBy): string {
  if (matchBy === 'codigo') return code
  if (matchBy === 'pais') return getAirportCountry(code) || ''
  return getAirportCity(code) || ''
}

function airportMatches(code: string, term: string, matchBy: FilterMatchBy): boolean {
  return normalizeSearch(airportFieldValue(code, matchBy)).includes(normalizeSearch(term))
}

function routeMatches(route: string[] | undefined, term: string, matchBy: FilterMatchBy): boolean {
  if (!route?.length) return false
  return route.some((code) => airportMatches(code, term, matchBy))
}

function estaDentroDeHoras(envio: EnvioEstado, horas?: number, currentTime?: string | null): boolean {
  if (!horas || envio.estado !== 'ENTREGADO') return true
  if (!envio.ultimaLlegadaUtc) return false

  const llegadaMs = Date.parse(envio.ultimaLlegadaUtc)
  if (Number.isNaN(llegadaMs)) return false

  const referenciaMs = currentTime ? Date.parse(currentTime) : Date.now()
  if (Number.isNaN(referenciaMs)) return false

  const diffMs = referenciaMs - llegadaMs
  return diffMs >= 0 && diffMs <= horas * 60 * 60 * 1000
}

export default function EnvioListPanel({ onEnvioSelect, selectedEnvioId, enviosExternos, currentTime }: Props) {
  const [tab, setTab] = useState<Tab>('pendientes')
  const [search, setSearch] = useState('')
  const [searchScope, setSearchScope] = useState<SearchScope>('todos')
  const [filterScope, setFilterScope] = useState<FilterScope>('directo')
  const [filterMatchBy, setFilterMatchBy] = useState<FilterMatchBy>('ciudad')
  const [originFilter, setOriginFilter] = useState('')
  const [destinationFilter, setDestinationFilter] = useState('')
  const [envios, setEnvios] = useState<EnvioEstado[]>([])
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const pollingRef = useRef(false)
  const mountedRef = useRef(true)

  const config = TAB_CONFIG.find((c) => c.key === tab)!

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (enviosExternos) {
      setEnvios(enviosExternos)
      setLoading(false)
      return
    }
    const fetch = async () => {
      if (pollingRef.current) return
      pollingRef.current = true
      setLoading(true)
      try {
        const horasFiltro = tab === 'entregados' && showAll ? undefined : config.horas
        const res = await cargaArchivosService.listarEnvios(config.estados, undefined, horasFiltro)
        if (mountedRef.current) setEnvios(res.envios)
      } catch {
        // ignore
      } finally {
        if (mountedRef.current) setLoading(false)
        pollingRef.current = false
      }
    }
    fetch()
    const interval = setInterval(fetch, 15000)
    return () => clearInterval(interval)
  }, [tab, enviosExternos, showAll])

  useEffect(() => { setShowAll(false) }, [tab])

  useEffect(() => {
    if (!enviosExternos) return

    const counts: Record<Tab, number> = {
      pendientes: countByEstado(enviosExternos, 'EN_ESPERA'),
      planificados: countByEstado(enviosExternos, 'EMBARCADO'),
      envuelo: countByEstado(enviosExternos, 'EN_VUELO'),
      entregados: enviosExternos.filter((e) =>
        e.estado === 'ENTREGADO' && estaDentroDeHoras(e, 4, currentTime)
      ).length,
    }

    if (counts[tab] > 0) return

    if (counts.pendientes > 0) {
      setTab('pendientes')
    } else if (counts.planificados > 0) {
      setTab('planificados')
    } else if (counts.envuelo > 0) {
      setTab('envuelo')
    } else if (counts.entregados > 0) {
      setTab('entregados')
    }
  }, [enviosExternos, currentTime, tab])

  const enviosVisibles = enviosExternos
    ? enviosExternos.filter((e) => {
        if (e.estado !== config.estados) return false
        if (tab === 'entregados' && !showAll) {
          return estaDentroDeHoras(e, config.horas, currentTime)
        }
        return true
      })
    : envios
  const term = normalizeSearch(search)
  const hasFilters = Boolean(originFilter || destinationFilter)
  const filtradosPorFiltro = enviosVisibles.filter((envio) => {
    const originMatches = !originFilter || (
      filterScope === 'directo'
        ? airportMatches(envio.origen, originFilter, filterMatchBy)
        : routeMatches(envio.rutaAeropuertos, originFilter, filterMatchBy)
    )
    if (!originMatches) return false

    const destinationMatches = !destinationFilter || (
      filterScope === 'directo'
        ? airportMatches(envio.destino, destinationFilter, filterMatchBy)
        : routeMatches(envio.rutaAeropuertos, destinationFilter, filterMatchBy)
    )
    return destinationMatches
  })

  const filtradosSinLimite = term
    ? filtradosPorFiltro.filter((envio) => {
        const idMatch = normalizeSearch(envio.id).includes(term)
        const originMatch = airportMatches(envio.origen, term, 'codigo') || airportMatches(envio.origen, term, 'ciudad') || airportMatches(envio.origen, term, 'pais')
        const destinationMatch = airportMatches(envio.destino, term, 'codigo') || airportMatches(envio.destino, term, 'ciudad') || airportMatches(envio.destino, term, 'pais')

        if (searchScope === 'id') return idMatch
        if (searchScope === 'origen') return originMatch
        if (searchScope === 'destino') return destinationMatch
        return idMatch || originMatch || destinationMatch
      })
    : filtradosPorFiltro
  const filtrados = showAll || term ? filtradosSinLimite : filtradosSinLimite.slice(0, DEFAULT_LIMIT)

  const estadoLabel: Record<string, string> = {
    EN_ESPERA: 'En espera',
    EMBARCADO: 'Embarcado',
    EN_VUELO: 'En vuelo',
    ENTREGADO: 'Entregado',
  }

  const estadoColor: Record<string, string> = {
    EN_ESPERA: 'text-amber-400 bg-amber-400/10',
    EMBARCADO: 'text-sky-400 bg-sky-400/10',
    EN_VUELO: 'text-emerald-400 bg-emerald-400/10',
    ENTREGADO: 'text-gray-400 bg-gray-400/10',
  }

  return (
    <div className="w-96 flex-1 min-h-0 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-200 mb-2">Envíos</h3>
        <div className="space-y-1.5">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">Búsqueda temporal</p>
            <div className="flex gap-1.5">
              <select
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                className="w-[88px] bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
              >
                <option value="todos">Todo</option>
                <option value="id">ID</option>
                <option value="origen">Origen</option>
                <option value="destino">Destino</option>
              </select>
              <div className="relative min-w-0 flex-1">
                <input
                  type="text"
                  placeholder="Buscar temporalmente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-800/80">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Filtros persistentes</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setOriginFilter('')
                    setDestinationFilter('')
                  }}
                  className="text-[9px] text-sky-400 hover:text-sky-300"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value as FilterScope)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
              >
                <option value="directo">Directo</option>
                <option value="ruta">Ruta</option>
              </select>
              <select
                value={filterMatchBy}
                onChange={(e) => setFilterMatchBy(e.target.value as FilterMatchBy)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
              >
                <option value="codigo">Código</option>
                <option value="ciudad">Ciudad</option>
                <option value="pais">País</option>
              </select>
              <input
                type="text"
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                placeholder="Filtrar origen"
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
              />
              <input
                type="text"
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                placeholder="Filtrar destino"
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {TAB_CONFIG.map((c) => {
          const tabCount = enviosExternos
            ? countByEstado(enviosExternos, c.estados)
            : envios.length
          return (
            <button
              key={c.key}
              onClick={() => setTab(c.key)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                tab === c.key
                  ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-400/5'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {c.label}
              {tab === c.key && (
                <span className="ml-1 text-[10px] text-gray-500">({tabCount})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && envios.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtrados.length === 0 && (
          <p className="text-center text-xs text-gray-500 py-8">
            {term ? 'No se encontraron envíos' : 'No hay envíos en esta categoría'}
          </p>
        )}

        {filtrados.map((envio) => {
          const isSelected = envio.id === selectedEnvioId
          const ut = envio.vueloActual || envio.vueloEsperado || envio.ultimoVuelo
          return (
            <button
              key={envio.id}
              onClick={() => onEnvioSelect(envio)}
              className={`w-full text-left px-3 py-2 border-b border-gray-800/50 transition-colors hover:bg-gray-800/50 ${
                isSelected ? 'bg-sky-900/20 border-l-2 border-l-sky-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-200 truncate">
                    <span className="font-medium">{getAirportCity(envio.origen) || envio.origen}</span>
                    <span className="text-gray-600 mx-1">→</span>
                    <span className="font-medium">{getAirportCity(envio.destino) || envio.destino}</span>
                  </div>
                  {ut && (
                    <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                      UT: {ut}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500">
                    {envio.cantidad} maleta{envio.cantidad !== 1 ? 's' : ''}
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${estadoColor[envio.estado] || 'text-gray-500'}`}>
                  {estadoLabel[envio.estado] || envio.estado}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-gray-800 text-[10px] text-gray-600 flex justify-between items-center">
        <span>Mostrando {filtrados.length} de {enviosVisibles.length}</span>
        <div className="flex items-center gap-2">
          {tab === 'entregados' ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAll(false)}
                className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                  !showAll
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'
                }`}
              >
                Ultimas 4h
              </button>
              <button
                onClick={() => setShowAll(true)}
                className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                  showAll
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'
                }`}
              >
                Mostrar todos
              </button>
            </div>
          ) : (
            !showAll && !term && enviosVisibles.length > DEFAULT_LIMIT && (
            <button onClick={() => setShowAll(true)} className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer">
              Mostrar todos
            </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
