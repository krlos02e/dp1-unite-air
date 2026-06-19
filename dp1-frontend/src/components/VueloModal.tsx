import type { VueloDTO } from '../types'
import { getAirportCityCountry } from '../data/airportsData'
import { formatTimeInTimezone, formatDateInTimezone } from '../utils/timezoneFormat'

interface Props {
  vuelo: VueloDTO | null
  isOpen: boolean
  onClose: () => void
  tzOffset: number
}

export default function VueloModal({ vuelo, isOpen, onClose, tzOffset }: Props) {
  if (!isOpen || !vuelo) return null

  const origenInfo = getAirportCityCountry(vuelo.origen)
  const destinoInfo = getAirportCityCountry(vuelo.destino)

  return (
    <div className="fixed bottom-6 right-6 z-[1000] w-96 sm:w-[28rem]">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-sky-400 truncate">Detalles de vuelo</h2>
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
            <span className="font-medium text-emerald-400">{origenInfo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Salida</span>
            <span className="font-medium">{formatDateInTimezone(vuelo.salidaUtc, tzOffset)} {formatTimeInTimezone(vuelo.salidaUtc, tzOffset)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Destino</span>
            <span className="font-medium text-red-400">{destinoInfo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Llegada</span>
            <span className="font-medium">{formatDateInTimezone(vuelo.llegadaUtc, tzOffset)} {formatTimeInTimezone(vuelo.llegadaUtc, tzOffset)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Maletas a bordo</span>
            <span className="font-medium text-amber-400">{vuelo.cargaActual} / {vuelo.capacidad}</span>
          </div>

          <div className="flex justify-between pt-1">
            <span className="text-gray-400">Progreso de vuelo</span>
            <span className="text-sky-400 font-medium">{Math.round(vuelo.progresoVuelo)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
