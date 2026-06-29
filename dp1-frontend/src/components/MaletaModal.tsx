import type { MaletaEstado, VueloDTO } from '../types'
import MaletaDetailCard from './MaletaDetailCard'

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

export default function MaletaModal({ maleta, isOpen, onClose, onIrAVuelo, dentroDelMapa = false, routeMode = 'actual', onRouteModeChange }: Props) {
  if (!isOpen || !maleta) return null

  return (
    <div className={`${dentroDelMapa ? 'absolute bottom-4 right-4' : 'fixed bottom-6 right-6'} z-[1001] w-80 max-w-[calc(100%-2rem)] sm:w-[22rem]`}>
      <div className="rounded-xl border border-gray-700 bg-gray-900/95 shadow-2xl backdrop-blur-sm">
        <MaletaDetailCard
          maleta={maleta}
          routeMode={routeMode}
          onRouteModeChange={onRouteModeChange}
          onClose={onClose}
          onIrAVuelo={onIrAVuelo}
          compact
        />
      </div>
    </div>
  )
}
