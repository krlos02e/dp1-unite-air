import { useState, useEffect } from 'react'
import { SimulationProvider } from './context/SimulationContext'
import GestionEnvios from './pages/GestionEnvios'
import OperacionDiaria from './pages/OperacionDiaria'
import Simulacion from './pages/Simulacion'
import Colapso from './pages/Colapso'
import { simulationService } from './services/SimulationService'

type Page = 'inicio' | 'carga' | 'operacion-diaria' | 'simulacion' | 'colapso'

function App() {
  const [page, setPage] = useState<Page>('inicio')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    simulationService.activa().then(() => {}).catch(() => {}).finally(() => setChecking(false))
  }, [])

  const nav = (p: Page) => () => setPage(p)

  return (
    <SimulationProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
        {checking ? (
          <div className="flex items-center justify-center h-screen">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <nav className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-6 overflow-x-auto">
              <h1 className="text-lg sm:text-xl font-bold text-sky-400 shrink-0">UniteAir</h1>
              <button onClick={nav('inicio')} className="text-sm sm:text-base hover:text-sky-300 shrink-0">Inicio</button>
              <button onClick={nav('carga')} className="text-sm sm:text-base hover:text-sky-300 shrink-0">Gestión de Envíos</button>
              <button onClick={nav('operacion-diaria')} className="text-sm sm:text-base hover:text-sky-300 shrink-0">Operación diaria</button>
              <button onClick={nav('simulacion')} className="text-sm sm:text-base hover:text-sky-300 shrink-0">Simulación del Periodo</button>
              <button onClick={nav('colapso')} className="text-sm sm:text-base hover:text-sky-300 shrink-0">Colapso</button>
            </nav>

            <main className="p-4 sm:p-6 flex-1">
              {page === 'inicio' && (
                <div className="text-center mt-10 sm:mt-20">
                  <h2 className="text-2xl sm:text-4xl font-bold mb-4">UniteAir Logistics</h2>
                  <p className="text-gray-400 mb-8 px-4">Sistema de simulación logística con optimización de rutas</p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4">
                    <button onClick={nav('carga')} className="bg-sky-600 hover:bg-sky-700 px-6 py-3 rounded-lg font-semibold">Gestión de Envíos</button>
                    <button onClick={nav('simulacion')} className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-semibold">Simulación del Periodo</button>
                    <button onClick={nav('operacion-diaria')} className="bg-violet-600 hover:bg-violet-700 px-6 py-3 rounded-lg font-semibold">Operación diaria</button>
                  </div>
                </div>
              )}
              {page === 'carga' && <GestionEnvios />}
              {page === 'operacion-diaria' && <OperacionDiaria />}
              {page === 'simulacion' && <Simulacion />}
              {page === 'colapso' && <Colapso />}
            </main>
          </>
        )}
      </div>
    </SimulationProvider>
  )
}

export default App
