import { useState, useEffect, useRef } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import { getAirportCity } from '../data/airportsData'
import type { EnvioEstado } from '../types'

type Tab = 'pendientes' | 'planificados' | 'envuelo' | 'entregados'

const TAB_CONFIG: { key: Tab; label: string; estados: string; horas?: number }[] = [
  { key: 'pendientes', label: 'Pendientes', estados: 'EN_ESPERA' },
  { key: 'planificados', label: 'Planificados', estados: 'EMBARCADO' },
  { key: 'envuelo', label: 'En vuelo', estados: 'EN_VUELO' },
  { key: 'entregados', label: 'Entregados', estados: 'ENTREGADO', horas: 4 },
]

interface Props {
  onEnvioSelect: (envio: EnvioEstado) => void
  selectedEnvioId?: string | null
}

export default function EnvioListPanel({ onEnvioSelect, selectedEnvioId }: Props) {
  const [tab, setTab] = useState<Tab>('pendientes')
  const [search, setSearch] = useState('')
  const [filtroId, setFiltroId] = useState(true)
  const [filtroOrigen, setFiltroOrigen] = useState(true)
  const [filtroDestino, setFiltroDestino] = useState(true)
  const [envios, setEnvios] = useState<EnvioEstado[]>([])
  const [loading, setLoading] = useState(false)
  const pollingRef = useRef(false)
  const mountedRef = useRef(true)

  const config = TAB_CONFIG.find((c) => c.key === tab)!

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const fetch = async () => {
      if (pollingRef.current) return
      pollingRef.current = true
      setLoading(true)
      try {
        const res = await cargaArchivosService.listarEnvios(config.estados, undefined, config.horas)
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
  }, [tab])

  const term = search.toLowerCase().trim()
  const filtrados = term
    ? envios.filter((e) => {
        if (filtroId && e.id.toLowerCase().includes(term)) return true
        if (filtroOrigen && (e.origen.toLowerCase().includes(term) || (getAirportCity(e.origen) || '').toLowerCase().includes(term))) return true
        if (filtroDestino && (e.destino.toLowerCase().includes(term) || (getAirportCity(e.destino) || '').toLowerCase().includes(term))) return true
        return false
      })
    : envios

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
    <div className="w-80 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
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
        {TAB_CONFIG.map((c) => (
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
              <span className="ml-1 text-[10px] text-gray-500">({envios.length})</span>
            )}
          </button>
        ))}
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
          const ut = envio.vueloActual || envio.vueloEsperado
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
      <div className="px-3 py-1.5 border-t border-gray-800 text-[10px] text-gray-600 flex justify-between">
        <span>Mostrando {filtrados.length} de {envios.length}</span>
        {tab === 'entregados' && <span>Últimas 4h</span>}
      </div>
    </div>
  )
}
