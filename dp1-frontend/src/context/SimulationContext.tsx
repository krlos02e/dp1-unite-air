import { createContext, useContext, useRef, useState, useCallback, useEffect, type ReactNode } from 'react'
import { simulationService } from '../services/SimulationService'
import type { SimulationState } from '../types'

interface SimulationContextType {
  simulationState: SimulationState | null
  isRunning: boolean
  pollingInterval: number
  elapsedRealSeconds: number
  isPaused: boolean
  setSimulationState: (state: SimulationState | null) => void
  setIsRunning: (running: boolean) => void
  setPollingInterval: (ms: number) => void
  setIsPaused: (paused: boolean) => void
  resetElapsedTimer: () => void
  startPolling: (sessionId: string, interval?: number) => void
  stopPolling: () => void
}

const SimulationContext = createContext<SimulationContextType | null>(null)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [pollingInterval, setPollingInterval] = useState(3000)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [elapsedRealSeconds, setElapsedRealSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRunningRef = useRef(false)

  const resetElapsedTimer = useCallback(() => {
    setElapsedRealSeconds(0)
  }, [])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }, [])

  const startPolling = useCallback((sessionId: string, interval?: number) => {
    stopPolling()
    setSimulationState(null)
    setIsRunning(true)
    setIsPaused(false)
    setElapsedRealSeconds(0)

    const effectiveInterval = interval ?? pollingInterval

    const poll = async () => {
      try {
        const state = await simulationService.poll(sessionId)
        setSimulationState(state)
        if (state.colapsada || state.status === 'COMPLETADA') {
          stopPolling()
        }
      } catch {
        stopPolling()
      }
    }

    poll()
    intervalRef.current = setInterval(poll, effectiveInterval)
  }, [pollingInterval, stopPolling])

  // Global real-time timer that persists across tabs
  useEffect(() => {
    const isFinished = simulationState?.status === 'COMPLETADA' || simulationState?.status === 'COLAPSADA' || simulationState?.status === 'ERROR' || (simulationState && simulationState.progreso >= 100)
    const isSimActive = isRunning && !isFinished
    const shouldRun = isSimActive && !isPaused

    if (shouldRun && !timerRunningRef.current) {
      timerRunningRef.current = true
      timerIntervalRef.current = setInterval(() => {
        setElapsedRealSeconds((prev) => prev + 1)
      }, 1000)
    } else if (!shouldRun && timerRunningRef.current) {
      timerRunningRef.current = false
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      timerRunningRef.current = false
    }
  }, [isRunning, isPaused, simulationState?.status, simulationState?.progreso])

  return (
    <SimulationContext.Provider value={{
      simulationState,
      isRunning,
      pollingInterval,
      elapsedRealSeconds,
      isPaused,
      setSimulationState,
      setIsRunning,
      setPollingInterval,
      setIsPaused,
      resetElapsedTimer,
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
