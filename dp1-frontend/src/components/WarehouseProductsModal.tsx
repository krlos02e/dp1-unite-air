import { useState, useEffect } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import { getAirportCity } from '../data/airportsData'
import type { EnvioEstado } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  codigoAlmacen: string | null
  onEnvioSelect?: (envio: EnvioEstado) => void
}

export default function WarehouseProductsModal({ isOpen, onClose, codigoAlmacen, onEnvioSelect }: Props) {
  const [productos, setProductos] = useState<EnvioEstado[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOpen || !codigoAlmacen) {
      setProductos([])
      return
    }

    const cargar = async () => {
      setLoading(true)
      try {
        const res = await cargaArchivosService.obtenerPaquetesAlmacen(codigoAlmacen)
        setProductos(res.envios || [])
      } catch {
        setProductos([])
      } finally {
        setLoading(false)
      }
    }

    cargar()
  }, [isOpen, codigoAlmacen])

  useEffect(() => {
    if (!isOpen) setSearch('')
  }, [isOpen])

  const term = search.toLowerCase().trim()
  const filtrados = term
    ? productos.filter(p => {
        const id = p.id.toLowerCase()
        const origen = (getAirportCity(p.origen) || '').toLowerCase()
        const destino = (getAirportCity(p.destino) || '').toLowerCase()
        return id.includes(term) || origen.includes(term) || destino.includes(term)
      })
    : productos

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
          <h2 className="text-xl font-bold text-gray-100">📦 Productos - {codigoAlmacen}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Búsqueda */}
        <div className="px-6 pt-4 pb-2">
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
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && filtrados.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              {term ? 'No se encontraron productos' : 'Sin productos en este almacén'}
            </div>
          )}

          {filtrados.map((producto) => {
            return (
              <button
                key={producto.id}
                onClick={() => onEnvioSelect?.(producto)}
                className="w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-200 truncate">
                      {producto.id}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      <span className="font-medium">{getAirportCity(producto.origen) || producto.origen}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium">{getAirportCity(producto.destino) || producto.destino}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {producto.cantidad} maleta{producto.cantidad !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${estadoColor[producto.estado] || 'text-gray-500'}`}>
                    {estadoLabel[producto.estado] || producto.estado}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500">{filtrados.length} de {productos.length} productos</span>
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
