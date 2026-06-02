import { useState, useEffect, useRef, useCallback } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { simulationService } from '../services/SimulationService'
import { cargaArchivosService } from '../services/CargaArchivosService'
import MapaAeropuertos from '../components/MapaAeropuertos'
import VueloModal from '../components/VueloModal'
import AeropuertoModal from '../components/AeropuertoModal'
import ResultadosModal from '../components/ResultadosModal'
import { formatDateTime } from '../utils/dateFormat'
import { AIRPORTS_DATA } from '../data/airportsData'
import type { VueloDTO, AeropuertoDTO } from '../types'

const aeropuertosFallback: AeropuertoDTO[] = Object.values(AIRPORTS_DATA).map((a) => ({
  codigoOACI: a.codigoOACI,
  latitud: a.latitud,
  longitud: a.longitud,
  ciudad: a.ciudad,
  capacidadMaxima: a.capacidad,
  ocupacionActual: 0,
  vuelosEntrantes: [],
  vuelosSalientes: [],
}))

export default function Simulacion() {
  const { simulationState, startPolling, stopPolling, isRunning } = useSimulation()
  const [sessionId, setSessionId] = useState<string>('')
  const [aeropuertosEstaticos, setAeropuertosEstaticos] = useState<AeropuertoDTO[]>(aeropuertosFallback)

  // Config state
  const [duracion, setDuracion] = useState(3)
  const [fechaInicio, setFechaInicio] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [algoritmo, setAlgoritmo] = useState('ALNS')
  const [velocidad, setVelocidad] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [selectedVuelo, setSelectedVuelo] = useState<VueloDTO | null>(null)
  const [selectedAeropuerto, setSelectedAeropuerto] = useState<AeropuertoDTO | null>(null)

  const handleVueloClick = useCallback((v: VueloDTO) => {
    setSelectedVuelo((prev) => (prev?.id === v.id ? null : v))
  }, [])

  const [isPaused, setIsPaused] = useState(false)
  const [showResultados, setShowResultados] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Cargar aeropuertos estáticos al montar
  useEffect(() => {
    cargaArchivosService.obtenerAeropuertos()
      .then((data) => {
        setAeropuertosEstaticos(data)
      })
      .catch(() => {})
  }, [])

  // Detectar simulación activa al montar (permite ver simulación en otras pestañas)
  useEffect(() => {
    let cancelled = false
    simulationService.activa().then((res) => {
      if (cancelled) return
      if (res.activa && res.sessionId) {
        setSessionId(res.sessionId)
        startPolling(res.sessionId)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [startPolling])

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [simulationState?.logs])

  // Keep selected flight info synced with latest poll data
  useEffect(() => {
    if (!selectedVuelo) return
    if (simulationState?.vuelos) {
      const updated = simulationState.vuelos.find((v) => v.id === selectedVuelo.id)
      if (updated) {
        setSelectedVuelo(updated)
      } else if (simulationState.status === 'COMPLETADA') {
        // Flight no longer in active list and sim completed → it reached destination
        setSelectedVuelo((prev) => (prev ? { ...prev, progresoVuelo: 100 } : prev))
      }
    }
  }, [simulationState?.vuelos, simulationState?.status])

  // Show results modal when simulation completes
  useEffect(() => {
    if (simulationState?.status === 'COMPLETADA') {
      setShowResultados(true)
    }
  }, [simulationState?.status])

  const handleIniciar = async () => {
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
        velocidad,
      })
      if (state.status === 'ERROR') {
        setError(state.logs?.[0]?.mensaje || 'Error al iniciar simulación')
        setLoading(false)
        return
      }
      setSessionId(state.sessionId)
      startPolling(state.sessionId, Math.max(600, 3000 / velocidad))
    } catch (err: any) {
      const msg = err?.response?.data?.logs?.[0]?.mensaje
        || err?.response?.data?.message
        || err?.message
        || 'Error al iniciar la simulación'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePause = async () => {
    if (!sessionId) return
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

  const handleDetener = async () => {
    if (!sessionId) return
    try {
      await simulationService.detener(sessionId)
    } catch {
      // ignore
    }
    stopPolling()
    setSessionId('')
    setIsPaused(false)
  }

  const handleNuevaSimulacion = () => {
    stopPolling()
    setSessionId('')
    setIsPaused(false)
  }

  const isCompleted = simulationState?.status === 'COMPLETADA'
  const isColapsada = simulationState?.status === 'COLAPSADA'
  const isError = simulationState?.status === 'ERROR'
  const showActionButton = sessionId && !isColapsada && !isError

  const aeropuertos = simulationState?.aeropuertos?.length ? simulationState.aeropuertos : aeropuertosEstaticos
  const vuelos = simulationState?.vuelos || []

  const vuelosCulminados = simulationState?.vuelosCulminados ?? 0
  const vuelosEnTransitoCount = simulationState?.vuelosEnTransito ?? 0
  const vuelosCancelados = simulationState?.vuelosCancelados ?? 0
  const maletasEntregadas = simulationState?.maletasEntregadas ?? 0
  const maletasEnTransito = simulationState?.maletasEnTransito ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior de parámetros */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400 font-medium">Escenario:</label>
          <select
            value={duracion}
            onChange={(e) => setDuracion(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={!!sessionId && !isError}
          >
            <option value={3}>3 días</option>
            <option value={5}>5 días</option>
            <option value={7}>7 días</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400 font-medium">Fecha inicio:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={!!sessionId && !isError}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400 font-medium">Hora inicio:</label>
          <input
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={!!sessionId && !isError}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400 font-medium">Algoritmo:</label>
          <select
            value={algoritmo}
            onChange={(e) => setAlgoritmo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={!!sessionId && !isError}
          >
            <option value="ALNS">ALNS</option>
            <option value="ACO">ACO</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400 font-medium">Velocidad:</label>
          <div className="flex gap-1">
            {[1, 2].map((v) => (
              <button
                key={v}
                onClick={() => setVelocidad(v)}
                disabled={isRunning && !isPaused && !isCompleted}
                className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                  velocidad === v
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {v}x
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-400 font-medium">{error}</span>
          )}
          {showActionButton ? (
            <div className="flex items-center gap-2">
              {!isCompleted && (
                <>
                  <button
                    onClick={handleTogglePause}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                      isPaused
                        ? 'bg-sky-600 hover:bg-sky-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {isPaused ? 'Reanudar' : 'Pausar'}
                  </button>
                  <button
                    onClick={handleDetener}
                    className="px-4 py-2 rounded-lg font-medium text-sm bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                  >
                    Detener
                  </button>
                </>
              )}
              {isCompleted && (
                <button
                  onClick={handleNuevaSimulacion}
                  className="px-4 py-2 rounded-lg font-medium text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Nueva Simulación
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleIniciar}
              disabled={loading}
              className="px-6 py-2 rounded-lg font-medium text-sm bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:bg-gray-600 cursor-pointer"
            >
              {loading ? 'Iniciando...' : 'Iniciar'}
            </button>
          )}
        </div>
      </div>

      {/* Mapa siempre visible con altura fija */}
      <div className="relative h-[48vh] bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <MapaAeropuertos
          aeropuertos={aeropuertos}
          vuelos={vuelos}
          selectedVueloId={selectedVuelo?.id || null}
          velocidad={velocidad}
          onAeropuertoClick={setSelectedAeropuerto}
          onVueloClick={handleVueloClick}
        />
      </div>

      {/* Paneles inferiores - SOLO 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estados / Contadores */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <h3 className="text-sm font-bold text-gray-100 mb-2">Estados</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-emerald-900/30 border border-emerald-800/50 rounded-lg px-3 py-2">
              <span className="text-xs text-emerald-400 font-medium">Vuelos Culminados</span>
              <span className="text-sm font-bold text-emerald-300 bg-emerald-800/50 px-2 py-0.5 rounded">{vuelosCulminados}</span>
            </div>
            <div className="flex items-center justify-between bg-amber-900/30 border border-amber-800/50 rounded-lg px-3 py-2">
              <span className="text-xs text-amber-400 font-medium">Vuelos en Tránsito</span>
              <span className="text-sm font-bold text-amber-300 bg-amber-800/50 px-2 py-0.5 rounded">{vuelosEnTransitoCount}</span>
            </div>
            <div className="flex items-center justify-between bg-red-900/30 border border-red-800/50 rounded-lg px-3 py-2">
              <span className="text-xs text-red-400 font-medium">Vuelos Cancelados</span>
              <span className="text-sm font-bold text-red-300 bg-red-800/50 px-2 py-0.5 rounded">{vuelosCancelados}</span>
            </div>
            <div className="flex items-center justify-between bg-sky-900/30 border border-sky-800/50 rounded-lg px-3 py-2">
              <span className="text-xs text-sky-400 font-medium">Maletas Entregadas</span>
              <span className="text-sm font-bold text-sky-300 bg-sky-800/50 px-2 py-0.5 rounded">{maletasEntregadas}</span>
            </div>
            <div className="flex items-center justify-between bg-violet-900/30 border border-violet-800/50 rounded-lg px-3 py-2">
              <span className="text-xs text-violet-400 font-medium">Maletas en Transito</span>
              <span className="text-sm font-bold text-violet-300 bg-violet-800/50 px-2 py-0.5 rounded">{maletasEnTransito}</span>
            </div>
          </div>

        </div>

        {/* Eventos Simulación */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col">
          <h3 className="text-sm font-bold text-gray-100 mb-1">Eventos Simulación</h3>
          <div className="flex-1 overflow-y-auto max-h-28 space-y-1 text-xs font-mono">
            {simulationState && simulationState.logs.length > 0 ? (
              simulationState.logs.slice(-20).map((log, i) => (
                <div key={i} className={`${
                  log.tipo === 'ERROR' ? 'text-red-400' :
                  log.tipo === 'WARN' ? 'text-amber-400' :
                  log.tipo === 'COLAPSO' ? 'text-red-500 font-bold' :
                  'text-gray-400'
                }`}>
                  [{formatDateTime(log.timestamp)}] {log.tipo}: {log.mensaje}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Inicie la simulación para ver eventos</p>
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Tiempo de Simulación */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <h3 className="text-sm font-bold text-gray-100 mb-1">Tiempo de Simulación</h3>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Inicio:</span>
              <span className="font-mono text-gray-200">{fechaInicio && horaInicio ? `${fechaInicio.split('-').reverse().join('/')} ${horaInicio}` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>Transcurrido:</span>
              <span className="font-mono text-gray-200">{simulationState?.simulationTime ? `${simulationState.progreso}%` : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>Actual:</span>
              <span className="font-mono text-gray-200">{formatDateTime(simulationState?.simulationTime)}</span>
            </div>
            <div className="flex justify-between">
              <span>Día:</span>
              <span className="font-mono text-gray-200">{simulationState ? Math.ceil((simulationState.progreso / 100) * duracion) : 0}</span>
            </div>
          </div>
          {simulationState && (
            <div className="mt-3">
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${simulationState.progreso}%` }}
                />
              </div>
              <p className="text-right text-[10px] text-gray-500 mt-1">{simulationState.progreso}%</p>
            </div>
          )}
        </div>
      </div>

      <VueloModal vuelo={selectedVuelo} isOpen={!!selectedVuelo} onClose={() => setSelectedVuelo(null)} />
      <AeropuertoModal aeropuerto={selectedAeropuerto} isOpen={!!selectedAeropuerto} onClose={() => setSelectedAeropuerto(null)} />
      <ResultadosModal
        state={simulationState}
        isOpen={showResultados}
        onClose={() => setShowResultados(false)}
        onNuevaSimulacion={() => {
          setShowResultados(false)
          handleNuevaSimulacion()
        }}
      />
    </div>
  )
}
