import { useState, useEffect, useCallback } from 'react'
import { dashboardService } from '../services/DashboardService'
import MapaAeropuertos from '../components/MapaAeropuertos'
import VueloModal from '../components/VueloModal'
import AeropuertoModal from '../components/AeropuertoModal'
import type { DashboardData, VueloDTO, AeropuertoDTO } from '../types'

interface Props {
  sessionId: string
}

export default function Dashboard({ sessionId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [selectedVuelo, setSelectedVuelo] = useState<VueloDTO | null>(null)
  const [selectedAeropuerto, setSelectedAeropuerto] = useState<AeropuertoDTO | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const d = await dashboardService.obtener(sessionId)
      setData(d)
    } catch {
      // ignore
    }
  }, [sessionId])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando dashboard...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-6">Operación Diaria</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="Maletas entregadas hoy" value={data.maletasEntregadasHoy} color="text-emerald-400" />
        <StatCard label="Maletas en tránsito" value={data.maletasEnTransito} color="text-sky-400" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-64 lg:h-96 mb-6">
        <MapaAeropuertos
          aeropuertos={data.aeropuertos}
          vuelos={data.vuelosActivos}
          onAeropuertoClick={setSelectedAeropuerto}
          onVueloClick={setSelectedVuelo}
        />
      </div>

      <VueloModal vuelo={selectedVuelo} isOpen={!!selectedVuelo} onClose={() => setSelectedVuelo(null)} />
      <AeropuertoModal aeropuerto={selectedAeropuerto} isOpen={!!selectedAeropuerto} onClose={() => setSelectedAeropuerto(null)} />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className={`text-2xl sm:text-4xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  )
}
