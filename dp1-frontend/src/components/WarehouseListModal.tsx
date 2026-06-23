import { useState } from 'react'
import { getAirportCity, getAirportCountry } from '../data/airportsData'
import type { AeropuertoDTO, EnvioEstado } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  almacenes: AeropuertoDTO[]
  envios: EnvioEstado[]
  onVerEnvios?: (codigoOACI: string) => void
  onVerProductos?: (codigoOACI: string) => void
}

export default function WarehouseListModal({ isOpen, onClose, almacenes, envios, onVerEnvios, onVerProductos }: Props) {
  const [search, setSearch] = useState('')

  const term = search.toLowerCase().trim()
  const filtrados = term
    ? almacenes.filter(a => {
        const codigo = a.codigoOACI.toLowerCase()
        const ciudad = (getAirportCity(a.codigoOACI) || '').toLowerCase()
        return codigo.includes(term) || ciudad.includes(term)
      })
    : almacenes

  const getOccupancyColor = (ocupPct: number) => {
    if (ocupPct <= 40) return 'bg-emerald-400/20 border-emerald-400'
    if (ocupPct <= 70) return 'bg-amber-400/20 border-amber-400'
    return 'bg-red-400/20 border-red-400'
  }

  const getOccupancyTextColor = (ocupPct: number) => {
    if (ocupPct <= 40) return 'text-emerald-400'
    if (ocupPct <= 70) return 'text-amber-400'
    return 'text-red-400'
  }

  const getProgressBarColor = (ocupPct: number) => {
    if (ocupPct <= 40) return 'bg-emerald-500'
    if (ocupPct <= 70) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const contarEnviosEnAlmacen = (codigo: string) => {
    return envios.filter(e => e.aeropuertoActual === codigo).length
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] mx-4 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">📦 Lista de Almacenes</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2">
          <input
            type="text"
            placeholder="Buscar por código o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtrados.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              {term ? 'No se encontraron almacenes' : 'Sin almacenes disponibles'}
            </div>
          )}

          {filtrados.map((almacen) => {
            const ocupPct = almacen.capacidadMaxima > 0
              ? Math.round((almacen.ocupacionActual / almacen.capacidadMaxima) * 100)
              : 0
            const ciudad = almacen.ciudad || getAirportCity(almacen.codigoOACI) || ''
            const pais = almacen.pais || getAirportCountry(almacen.codigoOACI) || ''
            const enviosCount = contarEnviosEnAlmacen(almacen.codigoOACI)

            return (
              <div key={almacen.codigoOACI} className="border-b border-gray-800/50 p-4 hover:bg-gray-800/30 transition-colors">
                {/* Nombre y código */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-emerald-400">{almacen.codigoOACI}</div>
                    <div className="text-xs text-gray-400">
                      {ciudad}{pais ? `, ${pais}` : ''}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg border text-xs font-semibold ${getOccupancyColor(ocupPct)}`}>
                    <span className={getOccupancyTextColor(ocupPct)}>
                      {ocupPct}%
                    </span>
                  </div>
                </div>

                {/* Ocupación */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressBarColor(ocupPct)}`}
                        style={{ width: `${Math.min(ocupPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {almacen.ocupacionActual}/{almacen.capacidadMaxima}
                    </span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onVerEnvios?.(almacen.codigoOACI)}
                    className="flex-1 flex items-center justify-center gap-1 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/50 rounded-lg px-3 py-1.5 text-xs font-medium text-sky-400 transition-colors"
                  >
                    ✈️ Envíos {enviosCount > 0 && `(${enviosCount})`}
                  </button>
                  <button
                    onClick={() => onVerProductos?.(almacen.codigoOACI)}
                    className="flex-1 flex items-center justify-center gap-1 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors"
                  >
                    📦 Productos
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500">{filtrados.length} de {almacenes.length} almacenes</span>
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
