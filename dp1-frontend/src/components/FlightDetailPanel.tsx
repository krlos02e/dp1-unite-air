import { memo } from 'react'
import type { VueloDTO } from '../types'

interface Props {
  vuelo: VueloDTO
  onClose: () => void
}

const FlightDetailPanel = memo(function FlightDetailPanel({ vuelo, onClose }: Props) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-10">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 className="font-bold text-gray-800">Detalle del vuelo:</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600 text-sm font-medium">Estado:</span>
          <span className="text-green-600 font-bold text-sm">A tiempo</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Codigo del vuelo:</p>
            <p className="font-bold text-gray-800">{vuelo.id}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Tipo de vuelo:</p>
            <p className="font-bold text-gray-800">Continental</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Origen:</p>
            <p className="font-bold text-gray-800">{vuelo.origen}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Capacidad de maletas:</p>
            <p className="font-bold text-gray-800">{vuelo.cargaActual}/{vuelo.capacidad}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Destino:</p>
            <p className="font-bold text-gray-800">{vuelo.destino}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">Progreso:</p>
            <p className="font-bold text-gray-800">{Math.round(vuelo.progresoVuelo)}%</p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default FlightDetailPanel
