import { useState, useEffect } from 'react'
import { SimulationProvider, useSimulation } from './context/SimulationContext'
import GestionEnvios from './pages/GestionEnvios'
import OperacionDiaria from './pages/OperacionDiaria'
import Simulacion from './pages/Simulacion'
import Colapso from './pages/Colapso'
import { simulationService } from './services/SimulationService'

type Page = 'carga' | 'operacion-diaria' | 'simulacion' | 'colapso'

function App() {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    simulationService.activa().then(() => {}).catch(() => {}).finally(() => setChecking(false))
  }, [])

  return (
    <SimulationProvider>
      <AppContent checking={checking} />
    </SimulationProvider>
  )
}

function AppContent({ checking }: { checking: boolean }) {
  const [page, setPage] = useState<Page>('simulacion')
  const [showBlockModal, setShowBlockModal] = useState(false)
  const { simulationState, isRunning } = useSimulation()

  const isFinished =
    simulationState?.status === 'COMPLETADA' ||
    simulationState?.status === 'COLAPSADA' ||
    simulationState?.status === 'ERROR' ||
    (simulationState && simulationState.progreso >= 100)

  const isSimBlocking = isRunning && !isFinished

  const handleNav = (p: Page) => () => {
    if (isSimBlocking && p !== 'simulacion') {
      setShowBlockModal(true)
    } else {
      setPage(p)
    }
  }

  const navButtonClass = (p: Page) =>
    `text-sm sm:text-base shrink-0 transition-colors ${
      isSimBlocking && p !== 'simulacion'
        ? 'text-gray-600 cursor-not-allowed'
        : 'hover:text-sky-300 cursor-pointer'
    }`

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {checking ? (
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <nav className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-6 overflow-x-auto">
            <h1 className="text-lg sm:text-xl font-bold text-sky-400 shrink-0">UniteAir</h1>
            <button onClick={handleNav('carga')} className={navButtonClass('carga')}>
              Gestión de Envíos
            </button>
            <button onClick={handleNav('operacion-diaria')} className={navButtonClass('operacion-diaria')}>
              Operación diaria
            </button>
            <button onClick={handleNav('simulacion')} className={navButtonClass('simulacion')}>
              Simulación del Periodo
            </button>
            <button onClick={handleNav('colapso')} className={navButtonClass('colapso')}>
              Colapso
            </button>
          </nav>

          <main className="p-4 sm:p-6 flex-1">
            {page === 'carga' && <GestionEnvios />}
            {page === 'operacion-diaria' && <OperacionDiaria />}
            {page === 'simulacion' && <Simulacion />}
            {page === 'colapso' && <Colapso />}
          </main>

          {showBlockModal && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60">
              <div className="bg-gray-900 border border-amber-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
                <h3 className="text-lg font-bold text-amber-400 mb-2">Simulación en curso</h3>
                <p className="text-gray-300 text-sm mb-6">
                  No puedes cambiar de pestaña mientras la simulación está en ejecución. Detén o pausa la simulación para navegar.
                </p>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="w-full bg-sky-600 hover:bg-sky-700 py-2.5 rounded-lg font-semibold text-sm"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App
