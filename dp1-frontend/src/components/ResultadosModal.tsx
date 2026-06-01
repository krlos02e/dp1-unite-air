import type { SimulationState } from '../types'

interface Props {
  state: SimulationState | null
  isOpen: boolean
  onClose: () => void
  onNuevaSimulacion: () => void
}

export default function ResultadosModal({ state, isOpen, onClose, onNuevaSimulacion }: Props) {
  if (!isOpen || !state) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-emerald-400">Simulación Completada</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Progreso total</span>
            <span className="font-bold text-emerald-400">{state.progreso}%</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Maletas entregadas</span>
            <span className="font-bold text-sky-400">{state.maletasEntregadas}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Maletas en tránsito</span>
            <span className="font-bold text-amber-400">{state.maletasEnTransito}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 py-2.5 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={onNuevaSimulacion}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-lg font-medium transition-colors"
          >
            Nueva Simulación
          </button>
        </div>
      </div>
    </div>
  )
}
