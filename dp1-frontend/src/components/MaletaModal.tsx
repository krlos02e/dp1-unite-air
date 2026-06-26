import type { MaletaEstado, VueloDTO } from '../types'
import { getAirportCityCountry } from '../data/airportsData'

interface Props {
  maleta: MaletaEstado | null
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
  EMBARCADO: { label: 'Embarcada', color: 'text-sky-400' },
  EN_VUELO: { label: 'En vuelo', color: 'text-emerald-400' },
  ENTREGADO: { label: 'Entregada', color: 'text-gray-400' },
}

export default function MaletaModal({ maleta, isOpen, onClose, onIrAVuelo, dentroDelMapa = false, routeMode = 'actual', onRouteModeChange }: Props) {
  if (!isOpen || !maleta) return null

  const estadoInfo = estadoLabels[maleta.estado] || { label: maleta.estado, color: 'text-gray-400' }
  const origenInfo = getAirportCityCountry(maleta.origen)
  const destinoInfo = getAirportCityCountry(maleta.destino)
  const aeropuertoInfo = getAirportCityCountry(maleta.aeropuertoActual)
  const ultimoVuelo = maleta.ultimoVuelo || maleta.vueloActual || maleta.vueloEsperado
  const tieneRutaAnterior = Boolean(maleta.rutaAnteriorAeropuertos?.length)
  const rutaAeropuertos = routeMode === 'anterior'
    ? (maleta.rutaAnteriorAeropuertos || [])
    : (maleta.rutaAeropuertos || [])
  const rutaVuelos = routeMode === 'anterior'
    ? (maleta.rutaAnteriorVuelos || [])
    : (maleta.rutaVuelos || [])

  return (
    <div className={`${dentroDelMapa ? 'absolute bottom-4 right-4' : 'fixed bottom-6 right-6'} z-[1001] w-80 max-w-[calc(100%-2rem)] sm:w-[22rem]`}>
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-3 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-amber-400 truncate">Detalles de maleta</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-gray-400">ID maleta</span>
            <span className="font-medium text-gray-200 text-[10px] truncate max-w-[13rem]" title={maleta.id}>{maleta.id}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-400">Envío</span>
            <span className="font-medium text-amber-300 text-[10px] truncate max-w-[13rem]" title={maleta.envioId}>{maleta.envioId}</span>
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
            <span className="text-gray-400">Ubicación actual</span>
            <span className="font-medium text-gray-200">{aeropuertoInfo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Subruta</span>
            <span className="font-medium text-sky-400">{maleta.subrutaIndex || 1}</span>
          </div>

          {(maleta.rutaAeropuertos?.length || tieneRutaAnterior) && (
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

          {maleta.vueloActual && (
            <div className="pt-1 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Vuelo actual</span>
                <button
                  onClick={() => onIrAVuelo?.(maleta.vueloActual!)}
                  className="text-sky-400 hover:text-sky-300 text-xs font-medium"
                >
                  {maleta.vueloActual} →
                </button>
              </div>
            </div>
          )}

          {maleta.vueloEsperado && (
            <div className="pt-1 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Vuelo esperado</span>
                <button
                  onClick={() => onIrAVuelo?.(maleta.vueloEsperado!)}
                  className="text-sky-400 hover:text-sky-300 text-xs font-medium"
                >
                  {maleta.vueloEsperado} →
                </button>
              </div>
            </div>
          )}

          {maleta.estado === 'ENTREGADO' && ultimoVuelo && (
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
