import type { SimulationState } from '../types'

interface Props {
  state: SimulationState | null
  onBack: () => void
}

export default function EscenarioColapso({ state, onBack }: Props) {
  if (!state) {
    return (
      <div className="text-center mt-20">
        <p className="text-gray-400">No hay datos de colapso</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-4 opacity-30 pointer-events-none">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-2 h-[50vh] lg:h-[70vh]" />
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-20" />
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-20" />
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-20" />
        </div>
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-gray-900 border border-red-700 rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-red-400 mb-2">Simulación finalizada por colapso</h2>
          <p className="text-gray-400 mb-6">El sistema ha detectado una situación crítica</p>

          <div className="space-y-3 mb-6">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Motivo</p>
              <p className="text-red-300 font-medium">{state.motivoColapso}</p>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Fecha y hora del fallo</span>
              <span className="font-mono text-sm">{state.simulationTime}</span>
            </div>


          </div>

          <button onClick={onBack}
                  className="w-full bg-sky-600 hover:bg-sky-700 py-3 rounded-lg font-semibold">
            Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
