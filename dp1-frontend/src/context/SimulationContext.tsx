import { createContext, useContext, useRef, useState, useCallback, useEffect, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { simulationService } from '../services/SimulationService'
import type { SimulationState } from '../types'

interface SimulationContextType {
  simulationState: SimulationState | null
  isRunning: boolean
  pollingInterval: number
  elapsedRealSeconds: number
  isPaused: boolean
  setSimulationState: Dispatch<SetStateAction<SimulationState | null>>
  setIsRunning: (running: boolean) => void
  setPollingInterval: (ms: number) => void
  setIsPaused: (paused: boolean) => void
  resetElapsedTimer: () => void
  startPolling: (sessionId: string, interval?: number, startedAt?: string) => void
  stopPolling: () => void
  resetSimulation: () => void
}

const SimulationContext = createContext<SimulationContextType | null>(null)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [pollingInterval, setPollingInterval] = useState(15000)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingActiveRef = useRef(false)

  const [elapsedRealSeconds, setElapsedRealSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRunningRef = useRef(false)
  const startedAtRef = useRef<number | null>(null)

  const resetElapsedTimer = useCallback(() => {
    setElapsedRealSeconds(0)
    startedAtRef.current = null
  }, [])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    pollingActiveRef.current = false
    setIsRunning(false)
  }, [])

  const resetSimulation = useCallback(() => {
    stopPolling()
    setSimulationState(null)
    setIsPaused(false)
    setElapsedRealSeconds(0)
    startedAtRef.current = null
  }, [stopPolling])

  const startPolling = useCallback((sessionId: string, interval?: number, startedAt?: string) => {
    stopPolling()
    setSimulationState(null)
    setIsRunning(true)
    setIsPaused(false)
    startedAtRef.current = startedAt ? Date.parse(startedAt) : Date.now()
    setElapsedRealSeconds(0)
    pollingActiveRef.current = true

    const effectiveInterval = interval ?? pollingInterval

    const poll = async () => {
      if (!pollingActiveRef.current) return
      try {
        const state = await simulationService.poll(sessionId)
        if (!pollingActiveRef.current) return
        if (state.startedAt && !startedAtRef.current) {
          startedAtRef.current = Date.parse(state.startedAt)
        }
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
        const startedAtMs = startedAtRef.current
        if (!startedAtMs) return
        setElapsedRealSeconds(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)))
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
      resetSimulation,
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
