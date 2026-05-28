import { useEffect, useRef, useState } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { simulationService } from '../services/SimulationService'
import MapaAeropuertos from '../components/MapaAeropuertos'
import VueloModal from '../components/VueloModal'
import AeropuertoModal from '../components/AeropuertoModal'
import type { SimulationState, VueloDTO, AeropuertoDTO } from '../types'

interface Props {
  sessionId: string
  onColapso?: (state: SimulationState) => void
  onBack: () => void
}

export default function SimulacionEjecucion({ sessionId, onColapso, onBack }: Props) {
  const { simulationState, startPolling, stopPolling } = useSimulation()
  const [selectedVuelo, setSelectedVuelo] = useState<VueloDTO | null>(null)
  const [selectedAeropuerto, setSelectedAeropuerto] = useState<AeropuertoDTO | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    startPolling(sessionId)
    return () => stopPolling()
  }, [sessionId, startPolling, stopPolling])

  useEffect(() => {
    if (simulationState?.sessionId !== sessionId) return
    if (simulationState?.colapsada) {
      stopPolling()
      onColapso?.(simulationState)
    }
    if (simulationState?.status === 'COMPLETADA') {
      stopPolling()
    }
  }, [simulationState?.colapsada, simulationState?.status, simulationState?.sessionId, sessionId, stopPolling, onColapso])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [simulationState?.logs])

  const handleTogglePause = async () => {
    try {
      if (isPaused) {
        await simulationService.reanudar(sessionId)
        setIsPaused(false)
      } else {
        await simulationService.pausar(sessionId)
        setIsPaused(true)
      }
    } catch {
      // ignore
    }
  }

  const handleNuevaSimulacion = () => {
    stopPolling()
    onBack()
  }

  if (!simulationState) {
    return (
      <div className="flex items-center justify-center h-64 px-4">
        <p className="text-gray-400 text-center">Iniciando simulación...</p>
      </div>
    )
  }

  const isPlanning = simulationState.status === 'PLANIFICANDO'
  const isCompleted = simulationState.status === 'COMPLETADA'
  const isColapsada = simulationState.status === 'COLAPSADA'
  const isError = simulationState.status === 'ERROR'
  const showActionButton = !isColapsada && !isError

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">
          {isPlanning ? 'Planificando Rutas' :
           isCompleted ? 'Simulación Completada' :
           isColapsada ? 'Simulación Colapsada' :
           isError ? 'Error en Simulación' :
           'Simulación en Curso'}
        </h2>
        {showActionButton && (
          <button
            onClick={isCompleted ? handleNuevaSimulacion : handleTogglePause}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              isCompleted
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : isPaused
                ? 'bg-sky-600 hover:bg-sky-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isCompleted
              ? 'Nueva Simulación'
              : isPaused
              ? 'Reanudar Simulación'
              : 'Pausar Simulación'}
          </button>
        )}
      </div>

      {isCompleted && (
        <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-300 p-3 rounded-xl mb-3">
          <p className="font-semibold">Simulación finalizada exitosamente</p>
          <p className="text-sm mt-1">
            Progreso alcanzado: {simulationState.progreso}% del tiempo simulado.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-4 relative">
        {isPlanning && !isPaused && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-xl pointer-events-none">
            <div className="text-center pointer-events-auto">
              <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-300 text-lg mb-2">Calculando rutas óptimas...</p>
              <p className="text-gray-500 text-sm">El motor de planificación está procesando los envíos</p>
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-2 h-[42vh] lg:h-[52vh]">
          <MapaAeropuertos
            aeropuertos={simulationState.aeropuertos}
            vuelos={simulationState.vuelos}
            onAeropuertoClick={setSelectedAeropuerto}
            onVueloClick={setSelectedVuelo}
          />
        </div>

        <div className="space-y-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-gray-400 text-sm">Tiempo de simulación</p>
            <p className="text-2xl font-mono font-bold text-sky-400">{simulationState.simulationTime}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-gray-400 text-sm mb-1">Progreso</p>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${simulationState.progreso}%` }} />
            </div>
            <p className="text-right text-xs text-gray-500 mt-1">{simulationState.progreso}%</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex-1">
            <h3 className="text-sm font-semibold text-gray-300 mb-1">Registro Operativo</h3>
            <div className="h-24 lg:h-32 overflow-y-auto space-y-1 text-xs font-mono">
              {simulationState.logs.map((log, i) => (
                <div key={i} className={`${log.tipo === 'ERROR' ? 'text-red-400' : log.tipo === 'WARN' ? 'text-yellow-400' : log.tipo === 'COLAPSO' ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                  [{log.timestamp}] {log.tipo}: {log.mensaje}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      <VueloModal vuelo={selectedVuelo} isOpen={!!selectedVuelo} onClose={() => setSelectedVuelo(null)} />
      <AeropuertoModal aeropuerto={selectedAeropuerto} isOpen={!!selectedAeropuerto} onClose={() => setSelectedAeropuerto(null)} />
    </div>
  )
}
