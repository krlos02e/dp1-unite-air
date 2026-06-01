import type { AeropuertoDTO } from '../types'
import { getAirportCity } from '../data/airportsData'

interface Props {
  aeropuerto: AeropuertoDTO | null
  isOpen: boolean
  onClose: () => void
}

export default function AeropuertoModal({ aeropuerto, isOpen, onClose }: Props) {
  if (!isOpen || !aeropuerto) return null

  const cityName = aeropuerto.ciudad || getAirportCity(aeropuerto.codigoOACI) || ''

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-emerald-400 mb-1">{aeropuerto.codigoOACI}</h2>
        {cityName && <p className="text-sm text-gray-400 mb-4">{cityName}</p>}

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Capacidad máxima</span>
            <span className="font-medium">{aeropuerto.capacidadMaxima}</span>
          </div>

          <div>
            <span className="text-gray-400 block mb-1">Vuelos entrantes ({aeropuerto.vuelosEntrantes.length})</span>
            {aeropuerto.vuelosEntrantes.length > 0 ? (
              <div className="max-h-32 overflow-y-auto pr-1">
                <ul className="list-disc list-inside text-gray-300 text-xs space-y-0.5">
                  {aeropuerto.vuelosEntrantes.map((v) => <li key={v}>{v}</li>)}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500 text-xs">Ninguno</p>
            )}
          </div>

          <div>
            <span className="text-gray-400 block mb-1">Vuelos salientes ({aeropuerto.vuelosSalientes.length})</span>
            {aeropuerto.vuelosSalientes.length > 0 ? (
              <div className="max-h-32 overflow-y-auto pr-1">
                <ul className="list-disc list-inside text-gray-300 text-xs space-y-0.5">
                  {aeropuerto.vuelosSalientes.map((v) => <li key={v}>{v}</li>)}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500 text-xs">Ninguno</p>
            )}
          </div>
        </div>

        <button onClick={onClose} className="mt-6 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg font-medium">
          Cerrar
        </button>
      </div>
    </div>
  )
}
