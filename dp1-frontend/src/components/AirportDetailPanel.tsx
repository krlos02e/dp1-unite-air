import { memo } from 'react'
import type { AeropuertoDTO } from '../types'

interface Props {
  aeropuerto: AeropuertoDTO
  onClose: () => void
}

const AirportDetailPanel = memo(function AirportDetailPanel({ aeropuerto, onClose }: Props) {
  const ratio = aeropuerto.capacidadMaxima > 0 ? aeropuerto.ocupacionActual / aeropuerto.capacidadMaxima : 0
  const estado = ratio > 0.8 ? 'Saturado' : ratio > 0.6 ? 'Alerta' : 'Normal'
  const color = ratio > 0.8 ? 'text-red-600' : ratio > 0.6 ? 'text-amber-600' : 'text-green-600'

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-10">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 className="font-bold text-gray-800">Detalle del aeropuerto:</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600 text-sm font-medium">Estado:</span>
          <span className={`font-bold text-sm ${color}`}>{estado}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Codigo:</p>
            <p className="font-bold text-gray-800">{aeropuerto.codigoOACI}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Capacidad:</p>
            <p className="font-bold text-gray-800">{aeropuerto.ocupacionActual}/{aeropuerto.capacidadMaxima}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Ciudad:</p>
            <p className="font-bold text-gray-800">{aeropuerto.ciudad || '—'}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Ocupacion:</p>
            <p className="font-bold text-gray-800">{Math.round(ratio * 100)}%</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Vuelos salientes:</p>
            <p className="font-bold text-gray-800">{aeropuerto.vuelosSalientes.length}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Vuelos entrantes:</p>
            <p className="font-bold text-gray-800">{aeropuerto.vuelosEntrantes.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default AirportDetailPanel
