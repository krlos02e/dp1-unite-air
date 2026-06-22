import { useState, useMemo } from 'react'
import { getAirportCity, getAirportCountry } from '../data/airportsData'
import type { VueloDTO, EnvioEstado } from '../types'

interface Props {
  vuelos: VueloDTO[]
  envios?: EnvioEstado[]
  onEnvioSelect?: (envio: EnvioEstado) => void
  selectedEnvioId?: string | null
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
}


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

const DEFAULT_LIMIT = 50

type SearchScope = 'todos' | 'codigo' | 'tramo' | 'origen' | 'destino'

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function locationTerms(code: string): string {
  return normalizeSearch([code, getAirportCity(code), getAirportCountry(code)].filter(Boolean).join(' '))
}

function occupationStatus(cargaActual: number, ocupPct: number) {
  if (cargaActual <= 0) {
    return { label: 'Vacío', bar: 'bg-sky-500', text: 'text-sky-400', track: 'bg-sky-950/80' }
  }
  if (ocupPct > 90) {
    return { label: 'Crítico', bar: 'bg-red-500', text: 'text-red-400', track: 'bg-gray-800' }
  }
  if (ocupPct > 70) {
    return { label: 'Alerta', bar: 'bg-amber-500', text: 'text-amber-400', track: 'bg-gray-800' }
  }
  return { label: 'Normal', bar: 'bg-emerald-500', text: 'text-emerald-400', track: 'bg-gray-800' }
}

export default function VueloListPanel({ vuelos, envios, onEnvioSelect, selectedEnvioId }: Props) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>('todos')
  const [showAll, setShowAll] = useState(false)
  const [searchScope, setSearchScope] = useState<SearchScope>('todos')

  const term = normalizeSearch(search)

  const enviosEnVuelo = (vueloId: string): EnvioEstado[] => {
    if (!envios) return []
    return envios.filter(e => e.vueloActual === vueloId || e.vueloEsperado === vueloId)
  }

  const filtradosSinLimite = useMemo(() => {
    return vuelos.filter(v => {
      if (filterEstado !== 'todos' && v.estado !== filterEstado) return false
      if (!term) return true

      const codigo = normalizeSearch(v.id)
      const origen = locationTerms(v.origen)
      const destino = locationTerms(v.destino)
      const tramo = `${origen} ${destino} ${normalizeSearch(`${v.origen}-${v.destino}`)}`

      if (searchScope === 'codigo') return codigo.includes(term)
      if (searchScope === 'tramo') return tramo.includes(term)
      if (searchScope === 'origen') return origen.includes(term)
      if (searchScope === 'destino') return destino.includes(term)
      return `${codigo} ${tramo}`.includes(term)
    })
  }, [vuelos, term, filterEstado, searchScope])

  const filtrados = showAll || term ? filtradosSinLimite : filtradosSinLimite.slice(0, DEFAULT_LIMIT)

  const estadosDisponibles = useMemo(() => {
    const set = new Set<string>()
    vuelos.forEach(v => { if (v.estado) set.add(v.estado) })
    return ['todos', ...Array.from(set)]
  }, [vuelos])

  return (
    <div className="w-80 flex-1 min-h-0 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-200 mb-0.5">Unidades de transporte</h3>
        <p className="text-[10px] text-gray-500 mb-2">Aviones · ocupación y carga transportada</p>
        <div className="flex gap-1.5">
          <select
            value={searchScope}
            onChange={(e) => setSearchScope(e.target.value as SearchScope)}
            aria-label="Buscar unidad de transporte por"
            className="w-[92px] bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
          >
            <option value="todos">Todo</option>
            <option value="codigo">Código UT</option>
            <option value="tramo">Tramo</option>
            <option value="origen">Origen</option>
            <option value="destino">Destino</option>
          </select>
          <input
            type="text"
            placeholder="Código, tramo o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Término de búsqueda de unidades de transporte"
            className="min-w-0 flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2" aria-label="Semáforo de ocupación">
          {[
            ['bg-sky-500', 'Vacío'],
            ['bg-emerald-500', 'Normal'],
            ['bg-amber-500', 'Alerta'],
            ['bg-red-500', 'Crítico'],
          ].map(([color, label]) => (
            <span key={label} className="inline-flex items-center gap-1 text-[9px] text-gray-500">
              <span className={`w-1.5 h-1.5 rounded-full ${color}`} />{label}
            </span>
          ))}
        </div>
      </div>

      {/* State filter */}
      <div className="px-3 py-1.5 border-b border-gray-800 flex gap-1 overflow-x-auto flex-nowrap">
        {estadosDisponibles.map(est => (
          <button
            key={est}
            onClick={() => setFilterEstado(est)}
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filterEstado === est
                ? 'bg-sky-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            {est === 'todos' ? 'Todos' : est.charAt(0) + est.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filtrados.length === 0 && (
          <p className="text-center text-xs text-gray-500 py-8">
            {term ? 'No se encontraron vuelos' : 'No hay vuelos disponibles'}
          </p>
        )}

        {filtrados.map((v) => {
          const isExpanded = expandedId === v.id
          const enviosEnEsteVuelo = enviosEnVuelo(v.id)
          const totalMaletas = enviosEnEsteVuelo.reduce((sum, e) => sum + e.cantidad, 0)
          const ocupPct = v.capacidad > 0 ? Math.round((v.cargaActual / v.capacidad) * 100) : 0
          const ocupacion = occupationStatus(v.cargaActual, ocupPct)

          return (
            <div key={v.id} className="border-b border-gray-800/50">
              {/* Main row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-mono text-sky-400 mb-0.5">UT {v.id}</div>
                    <div className="text-xs text-gray-200 truncate">
                      <span className="font-semibold text-emerald-400">{v.origen}</span>
                      <span className="text-gray-500 mx-0.5">→</span>
                      <span className="font-semibold text-emerald-400">{v.destino}</span>
                      <span className="text-[10px] text-gray-500 ml-1">· {formatTime(v.salidaUtc)}</span>
                    </div>
                    {v.estado && (
                      <span className={`text-[9px] font-medium px-1 py-0.5 rounded-full ${estadoColor[v.estado] || 'text-gray-500'}`}>
                        {v.estado}
                      </span>
                    )}
                  </div>
                </div>

                {/* Occupation bar */}
                <div className="flex items-center gap-2 mt-1">
                  <div className={`flex-1 ${ocupacion.track} rounded-full h-2 overflow-hidden`}>
                    <div
                      className={`h-full rounded-full transition-all ${ocupacion.bar}`}
                      style={{ width: `${Math.min(ocupPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono">
                    {v.cargaActual}/{v.capacidad}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${ocupacion.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ocupacion.bar}`} />
                    {ocupacion.label} ({ocupPct}%)
                  </span>
                </div>

                {envios && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    📦 {enviosEnEsteVuelo.length} envío{enviosEnEsteVuelo.length !== 1 ? 's' : ''} · 🎒 {totalMaletas} maleta{totalMaletas !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Expanded: shipments and products on this transport unit */}
              {isExpanded && envios && (
                <div className="bg-gray-800/30 border-t border-gray-800/50">
                  {enviosEnEsteVuelo.length === 0 ? (
                    <p className="px-4 py-2 text-[10px] text-gray-500">Este vuelo no traslada envíos</p>
                  ) : (
                    <>
                      <div className="px-4 py-1.5 text-[10px] text-gray-400 font-medium border-b border-gray-800/30">
                        Envíos y productos transportados: {enviosEnEsteVuelo.length} envío{enviosEnEsteVuelo.length !== 1 ? 's' : ''} · {totalMaletas} maleta{totalMaletas !== 1 ? 's' : ''}
                      </div>
                      {enviosEnEsteVuelo.map((envio) => {
                        const isSelected = envio.id === selectedEnvioId
                        return (
                          <button
                            key={envio.id}
                            onClick={() => onEnvioSelect?.(envio)}
                            className={`w-full text-left px-4 py-1.5 border-b border-gray-800/30 transition-colors hover:bg-gray-700/30 cursor-pointer ${
                              isSelected ? 'bg-sky-900/20 border-l-2 border-l-sky-500' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <div className="text-[9px] font-mono text-sky-400 truncate">Envío {envio.id}</div>
                                <div className="text-[10px] text-gray-300 truncate">
                                  <span className="font-medium">{getAirportCity(envio.origen) || envio.origen}</span>
                                  <span className="text-gray-600 mx-0.5">→</span>
                                  <span className="font-medium">{getAirportCity(envio.destino) || envio.destino}</span>
                                </div>
                                <div className="text-[9px] text-gray-500">{envio.cantidad} maleta{envio.cantidad !== 1 ? 's' : ''}</div>
                              </div>
                              <span className={`text-[9px] font-medium px-1 py-0.5 rounded-full whitespace-nowrap ${estadoColor[envio.estado] || 'text-gray-500'}`}>
                                {estadoLabel[envio.estado] || envio.estado}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-gray-800 text-[10px] text-gray-600 flex justify-between items-center">
        <span>{filtrados.length} de {vuelos.length} vuelos</span>
        {!showAll && !term && vuelos.length > DEFAULT_LIMIT && (
          <button onClick={() => setShowAll(true)} className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer">
            Mostrar todos
          </button>
        )}
      </div>
    </div>
  )
}
