import { useState, useEffect } from 'react'
import { getAirportCity } from '../data/airportsData'
import type { EnvioEstado } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  codigoAlmacen: string | null
  envios: EnvioEstado[]
  onEnvioSelect?: (envio: EnvioEstado) => void
}

export default function WarehouseShipmentsModal({ isOpen, onClose, codigoAlmacen, envios, onEnvioSelect }: Props) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'todos' | 'espera' | 'embarcado' | 'vuelo'>('todos')

  useEffect(() => {
    if (!isOpen) setSearch('')
  }, [isOpen])

  const filtradosPorAlmacen = codigoAlmacen
    ? envios.filter(e => e.aeropuertoActual === codigoAlmacen)
    : []

  const term = search.toLowerCase().trim()
  let filtrados = term
    ? filtradosPorAlmacen.filter(e => {
        const id = e.id.toLowerCase()
        const origen = (getAirportCity(e.origen) || '').toLowerCase()
        const destino = (getAirportCity(e.destino) || '').toLowerCase()
        return id.includes(term) || origen.includes(term) || destino.includes(term)
      })
    : filtradosPorAlmacen

  if (tab !== 'todos') {
    const estadoMap: Record<string, string> = {
      espera: 'EN_ESPERA',
      embarcado: 'EMBARCADO',
      vuelo: 'EN_VUELO',
    }
    filtrados = filtrados.filter(e => e.estado === estadoMap[tab])
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

  if (!isOpen || !codigoAlmacen) return null

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] mx-4 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">✈️ Envíos - {codigoAlmacen}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs y búsqueda */}
        <div className="px-6 pt-4 pb-2 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTab('todos')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                tab === 'todos'
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Todos ({filtradosPorAlmacen.length})
            </button>
            <button
              onClick={() => setTab('espera')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                tab === 'espera'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              En espera ({filtradosPorAlmacen.filter(e => e.estado === 'EN_ESPERA').length})
            </button>
            <button
              onClick={() => setTab('embarcado')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                tab === 'embarcado'
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Embarcado ({filtradosPorAlmacen.filter(e => e.estado === 'EMBARCADO').length})
            </button>
            <button
              onClick={() => setTab('vuelo')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                tab === 'vuelo'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              En vuelo ({filtradosPorAlmacen.filter(e => e.estado === 'EN_VUELO').length})
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar por ID, origen o destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtrados.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              {term ? 'No se encontraron envíos' : 'Sin envíos en este estado'}
            </div>
          )}

          {filtrados.map((envio) => {
            const ut = envio.vueloActual || envio.vueloEsperado
            return (
              <button
                key={envio.id}
                onClick={() => onEnvioSelect?.(envio)}
                className="w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-200 truncate">
                      {envio.id}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      <span className="font-medium">{getAirportCity(envio.origen) || envio.origen}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium">{getAirportCity(envio.destino) || envio.destino}</span>
                    </div>
                    {ut && (
                      <div className="text-xs text-gray-500 mt-0.5">UT: {ut}</div>
                    )}
                    <div className="text-xs text-gray-500">{envio.cantidad} maleta{envio.cantidad !== 1 ? 's' : ''}</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${estadoColor[envio.estado] || 'text-gray-500'}`}>
                    {estadoLabel[envio.estado] || envio.estado}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
