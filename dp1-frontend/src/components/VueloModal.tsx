import type { VueloDTO } from '../types'

interface Props {
  vuelo: VueloDTO | null
  isOpen: boolean
  onClose: () => void
}

export default function VueloModal({ vuelo, isOpen, onClose }: Props) {
  if (!isOpen || !vuelo) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-sky-400 mb-4">Vuelo {vuelo.id}</h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Origen</span>
            <span className="font-medium">{vuelo.origen}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Destino</span>
            <span className="font-medium">{vuelo.destino}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Capacidad</span>
            <span className="font-medium">{vuelo.capacidad}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Carga actual</span>
            <span className="font-medium">{vuelo.cargaActual}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Salida UTC</span>
            <span className="font-medium">{vuelo.salidaUtc}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Llegada UTC</span>
            <span className="font-medium">{vuelo.llegadaUtc}</span>
          </div>

          <div>
            <span className="text-gray-400 block mb-1">Progreso</span>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div className="bg-sky-500 h-3 rounded-full transition-all" style={{ width: `${vuelo.progresoVuelo}%` }} />
            </div>
            <span className="text-xs text-gray-500 mt-1 block text-right">{vuelo.progresoVuelo}%</span>
          </div>
        </div>

        <button onClick={onClose} className="mt-6 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg font-medium">
          Cerrar
        </button>
      </div>
    </div>
  )
}
