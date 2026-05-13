import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react'
import { simulationService } from '../services/SimulationService'
import type { SimulationState } from '../types'

interface SimulationContextType {
  simulationState: SimulationState | null
  isRunning: boolean
  pollingInterval: number
  setSimulationState: (state: SimulationState | null) => void
  setIsRunning: (running: boolean) => void
  setPollingInterval: (ms: number) => void
  startPolling: (sessionId: string) => void
  stopPolling: () => void
}

const SimulationContext = createContext<SimulationContextType | null>(null)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [pollingInterval, setPollingInterval] = useState(4000)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }, [])

  const startPolling = useCallback((sessionId: string) => {
    stopPolling()
    setIsRunning(true)

    const poll = async () => {
      try {
        const state = await simulationService.poll(sessionId)
        setSimulationState(state)
        if (state.colapsada) {
          stopPolling()
        }
      } catch {
        stopPolling()
      }
    }

    poll()
    intervalRef.current = setInterval(poll, pollingInterval)
  }, [pollingInterval, stopPolling])

  return (
    <SimulationContext.Provider value={{
      simulationState,
      isRunning,
      pollingInterval,
      setSimulationState,
      setIsRunning,
      setPollingInterval,
      startPolling,
      stopPolling,
    }}>
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulation(): SimulationContextType {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider')
  return ctx
}
