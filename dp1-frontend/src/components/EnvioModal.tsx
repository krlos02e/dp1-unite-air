import type { EnvioEstado, VueloDTO } from '../types'
import { getAirportCityCountry } from '../data/airportsData'

interface Props {
  envio: EnvioEstado | null
  isOpen: boolean
  onClose: () => void
  onIrAVuelo?: (vueloId: string) => void
  vuelos?: VueloDTO[]
  dentroDelMapa?: boolean
  routeMode?: 'actual' | 'anterior'
  onRouteModeChange?: (mode: 'actual' | 'anterior') => void
}

const estadoLabels: Record<string, { label: string; color: string }> = {
  EN_ESPERA: { label: 'En espera', color: 'text-amber-400' },
  EMBARCADO: { label: 'Embarcado', color: 'text-sky-400' },
  EN_VUELO: { label: 'En vuelo', color: 'text-emerald-400' },
  ENTREGADO: { label: 'Entregado', color: 'text-gray-400' },
}

export default function EnvioModal({ envio, isOpen, onClose, onIrAVuelo, dentroDelMapa = false, routeMode = 'actual', onRouteModeChange }: Props) {
  if (!isOpen || !envio) return null

  const estadoInfo = estadoLabels[envio.estado] || { label: envio.estado, color: 'text-gray-400' }
  const origenInfo = getAirportCityCountry(envio.origen)
  const destinoInfo = getAirportCityCountry(envio.destino)
  const aeropuertoInfo = getAirportCityCountry(envio.aeropuertoActual)
  const ultimoVuelo = envio.ultimoVuelo || envio.vueloActual || envio.vueloEsperado
  const tieneRutaAnterior = Boolean(envio.rutaAnteriorAeropuertos?.length)
  const rutaAeropuertos = routeMode === 'anterior'
    ? (envio.rutaAnteriorAeropuertos || [])
    : (envio.rutaAeropuertos || [])
  const rutaVuelos = routeMode === 'anterior'
    ? (envio.rutaAnteriorVuelos || [])
    : (envio.rutaVuelos || [])

  return (
    <div className={`${dentroDelMapa ? 'absolute bottom-4 right-4' : 'fixed bottom-6 right-6'} z-[1001] w-80 max-w-[calc(100%-2rem)] sm:w-[22rem]`}>
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-3 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-amber-400 truncate">Detalles de envío</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">ID</span>
            <span className="font-medium text-gray-200 text-[10px] truncate max-w-[13rem]" title={envio.id}>{envio.id}</span>
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

          {(envio.rutaAeropuertos?.length || tieneRutaAnterior) && (
            <div className="pt-1 border-t border-gray-700 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-400">Ruta mostrada</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onRouteModeChange?.('actual')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      routeMode === 'actual'
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                        : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    Actual
                  </button>
                  <button
                    onClick={() => onRouteModeChange?.('anterior')}
                    disabled={!tieneRutaAnterior}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      routeMode === 'anterior'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    Anterior
                  </button>
                </div>
              </div>
              {rutaAeropuertos.length > 0 && (
                <>
                  <div className="text-[10px] text-gray-500 break-words">
                    Ruta: {rutaAeropuertos.join(' -> ')}
                  </div>
                  <div className="space-y-1">
                    {rutaAeropuertos.map((codigo, index) => {
                      const rol = index === 0 ? 'Origen' : index === rutaAeropuertos.length - 1 ? 'Destino' : `Escala ${index}`
                      const vueloTramo = index > 0 ? rutaVuelos[index - 1] : null
                      return (
                        <div key={`${routeMode}-${codigo}-${index}`} className="flex justify-between gap-2 text-[10px] text-gray-400">
                          <span>{rol}: {getAirportCityCountry(codigo)}</span>
                          <span>{vueloTramo ? `UT ${vueloTramo}` : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

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

          {envio.estado === 'ENTREGADO' && ultimoVuelo && (
            <div className="pt-1 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Último vuelo</span>
                <button
                  onClick={() => onIrAVuelo?.(ultimoVuelo)}
                  className="text-sky-400 hover:text-sky-300 text-xs font-medium truncate max-w-[13rem]"
                  title={ultimoVuelo}
                >
                  {ultimoVuelo} →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
