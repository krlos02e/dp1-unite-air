import { useState, useEffect, useRef } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import { getAirportCity } from '../data/airportsData'
import type { EnvioEstado } from '../types'

type Tab = 'pendientes' | 'planificados' | 'envuelo' | 'entregados'

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
  const [tab, setTab] = useState<Tab>('envuelo')
  const [search, setSearch] = useState('')
  const [filtroId, setFiltroId] = useState(true)
  const [filtroOrigen, setFiltroOrigen] = useState(true)
  const [filtroDestino, setFiltroDestino] = useState(true)
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

  const enviosVisibles = enviosExternos
    ? enviosExternos.filter((e) => {
        if (e.estado !== config.estados) return false
        if (tab === 'entregados' && !showAll) {
          return estaDentroDeHoras(e, config.horas, currentTime)
        }
        return true
      })
    : envios
  const term = search.toLowerCase().trim()
  const filtradosSinLimite = term
    ? enviosVisibles.filter((e) => {
        if (filtroId && e.id.toLowerCase().includes(term)) return true
        if (filtroOrigen && (e.origen.toLowerCase().includes(term) || (getAirportCity(e.origen) || '').toLowerCase().includes(term))) return true
        if (filtroDestino && (e.destino.toLowerCase().includes(term) || (getAirportCity(e.destino) || '').toLowerCase().includes(term))) return true
        return false
      })
    : enviosVisibles
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
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex gap-1.5">
            {([['ID', filtroId, setFiltroId], ['Origen', filtroOrigen, setFiltroOrigen], ['Destino', filtroDestino, setFiltroDestino]] as const).map(([label, active, setter]) => (
              <button
                key={label}
                onClick={() => setter(!active)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                  active
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
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
