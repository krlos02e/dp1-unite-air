import { useState, useMemo } from 'react'
import { getAirportCity } from '../data/airportsData'
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

export default function VueloListPanel({ vuelos, envios, onEnvioSelect, selectedEnvioId }: Props) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>('todos')
  const [showAll, setShowAll] = useState(false)

  const term = search.toLowerCase().trim()

  const enviosEnVuelo = (vueloId: string): EnvioEstado[] => {
    if (!envios) return []
    return envios.filter(e => e.vueloActual === vueloId || e.vueloEsperado === vueloId)
  }

  const filtradosSinLimite = useMemo(() => {
    return vuelos.filter(v => {
      if (filterEstado !== 'todos' && v.estado !== filterEstado) return false
      if (!term) return true
      return v.id.toLowerCase().includes(term) ||
        v.origen.toLowerCase().includes(term) ||
        v.destino.toLowerCase().includes(term)
    })
  }, [vuelos, term, filterEstado])

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
        <h3 className="text-sm font-semibold text-gray-200 mb-2">Aviones</h3>
        <input
          type="text"
          placeholder="Buscar vuelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
        />
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

          return (
            <div key={v.id} className="border-b border-gray-800/50">
              {/* Main row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="min-w-0 flex-1">
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
                  <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        ocupPct > 90 ? 'bg-red-500' : ocupPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(ocupPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono">
                    {v.cargaActual}/{v.capacidad}
                  </span>
                  <span className={`text-[10px] font-mono font-medium ${
                    ocupPct > 90 ? 'text-red-400' : ocupPct > 70 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    ({ocupPct}%)
                  </span>
                </div>

                {envios && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    📦 {enviosEnEsteVuelo.length} envío{enviosEnEsteVuelo.length !== 1 ? 's' : ''} · 🎒 {totalMaletas} maleta{totalMaletas !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Expanded: envios on this flight */}
              {isExpanded && envios && (
                <div className="bg-gray-800/30 border-t border-gray-800/50">
                  {enviosEnEsteVuelo.length === 0 ? (
                    <p className="px-4 py-2 text-[10px] text-gray-500">Este vuelo no traslada envíos</p>
                  ) : (
                    <>
                      <div className="px-4 py-1.5 text-[10px] text-gray-400 font-medium border-b border-gray-800/30">
                        🎒 {totalMaletas} producto{totalMaletas !== 1 ? 's' : ''} en {enviosEnEsteVuelo.length} envío{enviosEnEsteVuelo.length !== 1 ? 's' : ''}
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
