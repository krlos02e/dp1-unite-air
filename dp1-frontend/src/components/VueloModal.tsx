import type { VueloDTO } from '../types'
import { getAirportCity } from '../data/airportsData'
import { formatDateTime } from '../utils/dateFormat'

interface Props {
  vuelo: VueloDTO | null
  isOpen: boolean
  onClose: () => void
}

export default function VueloModal({ vuelo, isOpen, onClose }: Props) {
  if (!isOpen || !vuelo) return null

  const origenCiudad = getAirportCity(vuelo.origen) || vuelo.origen
  const destinoCiudad = getAirportCity(vuelo.destino) || vuelo.destino

  return (
    <div className="fixed bottom-4 right-4 z-[1000] w-72 sm:w-80">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-2xl">
        {/* Header con X */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-sky-400 truncate">Vuelo {origenCiudad} - {destinoCiudad}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Origen</span>
            <span className="font-medium text-emerald-400">{origenCiudad}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Destino</span>
            <span className="font-medium text-red-400">{destinoCiudad}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Capacidad</span>
            <span className="font-medium">{vuelo.capacidad}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Salida UTC</span>
            <span className="font-medium">{formatDateTime(vuelo.salidaUtc)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Llegada UTC</span>
            <span className="font-medium">{formatDateTime(vuelo.llegadaUtc)}</span>
          </div>

          <div className="flex justify-between pt-1">
            <span className="text-gray-400">Progreso</span>
            <span className="text-sky-400 font-medium">{Math.round(vuelo.progresoVuelo)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
