import { HttpClient } from './HttpClient'
import type { DashboardData } from '../types'

class DashboardService extends HttpClient {
  obtener(sessionId: string): Promise<DashboardData> {
    return this.get<DashboardData>(`/dashboard/${sessionId}`)
  }
}

export const dashboardService = new DashboardService()
