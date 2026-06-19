import type { EnvioEstado, VueloDTO } from '../types'
import { getAirportCityCountry } from '../data/airportsData'

interface Props {
  envio: EnvioEstado | null
  isOpen: boolean
  onClose: () => void
  onIrAVuelo?: (vueloId: string) => void
  vuelos?: VueloDTO[]
}

const estadoLabels: Record<string, { label: string; color: string }> = {
  EN_ESPERA: { label: 'En espera', color: 'text-amber-400' },
  EMBARCADO: { label: 'Embarcado', color: 'text-sky-400' },
  EN_VUELO: { label: 'En vuelo', color: 'text-emerald-400' },
  ENTREGADO: { label: 'Entregado', color: 'text-gray-400' },
}

export default function EnvioModal({ envio, isOpen, onClose, onIrAVuelo }: Props) {
  if (!isOpen || !envio) return null

  const estadoInfo = estadoLabels[envio.estado] || { label: envio.estado, color: 'text-gray-400' }
  const origenInfo = getAirportCityCountry(envio.origen)
  const destinoInfo = getAirportCityCountry(envio.destino)
  const aeropuertoInfo = getAirportCityCountry(envio.aeropuertoActual)

  return (
    <div className="fixed bottom-6 right-6 z-[1000] w-80 sm:w-96">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-amber-400 truncate">Detalles de envio</h2>
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
            <span className="text-gray-400">ID</span>
            <span className="font-medium text-gray-200 text-xs">{envio.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Estado</span>
            <span className={`font-medium ${estadoInfo.color}`}>{estadoInfo.label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Origen</span>
            <span className="font-medium text-emerald-400">{origenInfo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Destino</span>
            <span className="font-medium text-red-400">{destinoInfo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Ubicacion actual</span>
            <span className="font-medium text-gray-200">{aeropuertoInfo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Cantidad</span>
            <span className="font-medium text-amber-400">{envio.cantidad}</span>
          </div>

          {envio.vueloActual && (
            <div className="pt-1 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Vuelo actual</span>
                <button
                  onClick={() => onIrAVuelo?.(envio.vueloActual!)}
                  className="text-sky-400 hover:text-sky-300 text-xs font-medium"
                >
                  {envio.vueloActual} →
                </button>
              </div>
            </div>
          )}

          {envio.vueloEsperado && (
            <div className="pt-1 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Vuelo esperado</span>
                <button
                  onClick={() => onIrAVuelo?.(envio.vueloEsperado!)}
                  className="text-sky-400 hover:text-sky-300 text-xs font-medium"
                >
                  {envio.vueloEsperado} →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
