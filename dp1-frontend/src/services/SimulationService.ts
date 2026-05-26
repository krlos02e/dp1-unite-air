import { HttpClient } from './HttpClient'
import type { SimulationState } from '../types'

class SimulationService extends HttpClient {
  iniciar(config: { duracionDias: number; fechaInicio: string; horaInicio: string; algoritmo: string }): Promise<SimulationState> {
    return this.post<SimulationState>('/simulacion/iniciar', config)
  }

  estado(sessionId: string): Promise<SimulationState> {
    return this.get<SimulationState>(`/simulacion/estado/${sessionId}`)
  }

  detener(sessionId: string): Promise<SimulationState> {
    return this.post<SimulationState>(`/simulacion/detener/${sessionId}`)
  }

  poll(sessionId: string): Promise<SimulationState> {
    return this.get<SimulationState>(`/simulacion/${sessionId}/poll`)
  }

  activa(): Promise<{ activa: boolean; sessionId?: string; status?: string; progreso?: number }> {
    return this.get(`/simulacion/activa`)
  }
}

export const simulationService = new SimulationService()
