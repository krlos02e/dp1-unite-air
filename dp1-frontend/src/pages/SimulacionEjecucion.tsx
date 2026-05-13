import { useEffect, useRef } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { simulationService } from '../services/SimulationService'
import MapaAeropuertos from '../components/MapaAeropuertos'
import VueloModal from '../components/VueloModal'
import AeropuertoModal from '../components/AeropuertoModal'
import type { SimulationState, VueloDTO, AeropuertoDTO } from '../types'
import { useState } from 'react'

interface Props {
  sessionId: string
  onColapso?: (state: SimulationState) => void
  onBack: () => void
}

export default function SimulacionEjecucion({ sessionId, onColapso, onBack }: Props) {
  const { simulationState, isRunning, startPolling, stopPolling, setPollingInterval } = useSimulation()
  const [selectedVuelo, setSelectedVuelo] = useState<VueloDTO | null>(null)
  const [selectedAeropuerto, setSelectedAeropuerto] = useState<AeropuertoDTO | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    startPolling(sessionId)
    return () => stopPolling()
  }, [sessionId, startPolling, stopPolling])

  useEffect(() => {
    if (simulationState?.colapsada) {
      stopPolling()
      onColapso?.(simulationState)
    }
  }, [simulationState?.colapsada, stopPolling, onColapso])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [simulationState?.logs])

  const handleDetener = async () => {
    try {
      await simulationService.detener(sessionId)
      stopPolling()
      onBack()
    } catch {
      // ignore
    }
  }

  if (!simulationState) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Iniciando simulación...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Simulación en Curso</h2>
        <button onClick={handleDetener}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium text-sm">
          Detener Simulación
        </button>
      </div>

      <div className="grid grid-cols-[7fr_3fr] gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-2 h-[70vh]">
          <MapaAeropuertos
            aeropuertos={simulationState.aeropuertos}
            vuelos={simulationState.vuelos}
            onAeropuertoClick={setSelectedAeropuerto}
            onVueloClick={setSelectedVuelo}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Tiempo de simulación</p>
            <p className="text-2xl font-mono font-bold text-sky-400">{simulationState.simulationTime}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-2">Progreso</p>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div className="bg-emerald-500 h-4 rounded-full transition-all" style={{ width: `${simulationState.progreso}%` }} />
            </div>
            <p className="text-right text-xs text-gray-500 mt-1">{simulationState.progreso}%</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Entregadas</span>
              <span className="text-emerald-400 font-bold">{simulationState.maletasEntregadas}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">En tránsito</span>
              <span className="text-sky-400 font-bold">{simulationState.maletasEnTransito}</span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex-1">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Registro Operativo</h3>
            <div className="h-48 overflow-y-auto space-y-1 text-xs font-mono">
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
