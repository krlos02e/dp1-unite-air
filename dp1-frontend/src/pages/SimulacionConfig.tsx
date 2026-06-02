import { useState } from 'react'
import { simulationService } from '../services/SimulationService'

interface Props {
  onStart: (sessionId: string) => void
}

export default function SimulacionConfig({ onStart }: Props) {
  const [duracion, setDuracion] = useState(3)
  const [fechaInicio, setFechaInicio] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [algoritmo, setAlgoritmo] = useState('ALNS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!fechaInicio || !horaInicio) {
      setError('Complete todos los campos')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const state = await simulationService.iniciar({
        duracionDias: duracion,
        fechaInicio,
        horaInicio,
        algoritmo,
        velocidad: 1,
      })
      onStart(state.sessionId)
    } catch (err: any) {
      const msg = err?.response?.data?.logs?.[0]?.mensaje
        || err?.response?.data?.message
        || err?.message
        || 'Error al iniciar la simulación'
      setError(msg)
      console.error('Error al iniciar simulación:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-6">Configurar Simulación</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Duración</label>
          <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200">
            <option value={3}>3 días</option>
            <option value={5}>5 días</option>
            <option value={7}>7 días</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Fecha inicio</label>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200" />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Hora inicio</label>
          <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200" />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Algoritmo</label>
          <select value={algoritmo} onChange={(e) => setAlgoritmo(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200">
            <option value="ALNS">ALNS</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2.5 rounded-lg font-semibold">
          {loading ? 'Iniciando...' : 'Iniciar Simulación'}
        </button>
      </div>
    </div>
  )
}
