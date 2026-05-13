import { useState } from 'react'
import { SimulationProvider } from './context/SimulationContext'
import GestionEnvios from './pages/GestionEnvios'
import Dashboard from './pages/Dashboard'
import SimulacionConfig from './pages/SimulacionConfig'
import SimulacionEjecucion from './pages/SimulacionEjecucion'
import EscenarioColapso from './pages/EscenarioColapso'
import type { SimulationState } from './types'

type Page = 'inicio' | 'carga' | 'dashboard' | 'config' | 'ejecucion' | 'colapso'

function App() {
  const [page, setPage] = useState<Page>('inicio')
  const [sessionId, setSessionId] = useState<string>('')
  const [colapsoState, setColapsoState] = useState<SimulationState | null>(null)

  const nav = (p: Page) => () => setPage(p)
  
  return (
    <SimulationProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-6 overflow-x-auto">
          <h1 className="text-lg sm:text-xl font-bold text-sky-400 shrink-0">UniteAir</h1>
          <button onClick={nav('inicio')} className="text-sm sm:text-base hover:text-sky-300 shrink-0">Inicio</button>
          <button onClick={nav('carga')} className="text-sm sm:text-base hover:text-sky-300 shrink-0">Gestión de Envíos</button>
          <button onClick={nav('config')} className="text-sm sm:text-base hover:text-sky-300 shrink-0">Simulación</button>
        </nav>

        <main className="p-4 sm:p-6">
          {page === 'inicio' && (
            <div className="text-center mt-10 sm:mt-20">
              <h2 className="text-2xl sm:text-4xl font-bold mb-4">UniteAir Logistics</h2>
              <p className="text-gray-400 mb-8 px-4">Sistema de simulación logística con optimización de rutas</p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4">
                <button onClick={nav('carga')} className="bg-sky-600 hover:bg-sky-700 px-6 py-3 rounded-lg font-semibold">Gestión de Envíos</button>
                <button onClick={nav('config')} className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-semibold">Simulación</button>
                <button onClick={nav('dashboard')} className="bg-violet-600 hover:bg-violet-700 px-6 py-3 rounded-lg font-semibold">Dashboard</button>
              </div>
            </div>
          )}
          {page === 'carga' && <GestionEnvios />}
          {page === 'dashboard' && sessionId && <Dashboard sessionId={sessionId} />}
          {!sessionId && page === 'dashboard' && (
            <div className="text-center mt-20">
              <p className="text-gray-400 mb-4">No hay sesión activa. Inicia una simulación primero.</p>
              <button onClick={nav('config')} className="bg-sky-600 px-4 py-2 rounded">Ir a Simulación</button>
            </div>
          )}
          {page === 'config' && (
            <SimulacionConfig onStart={(sid) => { setSessionId(sid); setPage('ejecucion') }} />
          )}
          {page === 'ejecucion' && sessionId && (
            <SimulacionEjecucion 
              sessionId={sessionId} 
              onColapso={(s) => { setColapsoState(s); setPage('colapso') }}
              onBack={nav('inicio')}
            />
          )}
          {page === 'colapso' && <EscenarioColapso state={colapsoState} onBack={nav('inicio')} />}
        </main>
      </div>
    </SimulationProvider>
  )
}

export default App
