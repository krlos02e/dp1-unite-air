import { useState, useEffect, useRef, useCallback } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { simulationService } from '../services/SimulationService'
import { cargaArchivosService } from '../services/CargaArchivosService'
import MapaAeropuertos from '../components/MapaAeropuertos'
import VueloModal from '../components/VueloModal'
import AeropuertoModal from '../components/AeropuertoModal'
import EnvioModal from '../components/EnvioModal'
import ResultadosModal from '../components/ResultadosModal'
import { formatDateTime } from '../utils/dateFormat'
import { AIRPORTS_DATA } from '../data/airportsData'
import type { VueloDTO, AeropuertoDTO, SimulationState, EnvioEstado } from '../types'

const SIM_CONFIG_KEY = 'uniteair_simConfig'
const SIM_STOPPED_KEY = 'uniteair_simStopped'
const DURACION_FIJA = 5

const aeropuertosFallback: AeropuertoDTO[] = Object.values(AIRPORTS_DATA).map((a) => ({
  codigoOACI: a.codigoOACI,
  latitud: a.latitud,
  longitud: a.longitud,
  ciudad: a.ciudad,
  capacidadMaxima: a.capacidad,
  ocupacionActual: 0,
  vuelosEntrantes: [],
  vuelosSalientes: [],
  vuelosCanceladosSalientes: [],
}))

export default function Simulacion() {
  const {
    simulationState,
    startPolling,
    resetSimulation,
    elapsedRealSeconds,
    setIsPaused,
    resetElapsedTimer,
  } = useSimulation()
  const [sessionId, setSessionId] = useState<string>('')
  const [aeropuertosEstaticos, setAeropuertosEstaticos] = useState<AeropuertoDTO[]>(aeropuertosFallback)

  // Config state
  const [fechaInicio, setFechaInicio] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const algoritmo = 'ALNS'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [selectedVuelo, setSelectedVuelo] = useState<VueloDTO | null>(null)
  const [selectedAeropuerto, setSelectedAeropuerto] = useState<AeropuertoDTO | null>(null)
  const [selectedEnvio, setSelectedEnvio] = useState<EnvioEstado | null>(null)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [mapTz, setMapTz] = useState(0)

  const handleVueloClick = useCallback((v: VueloDTO) => {
    setSelectedVuelo((prev) => (prev?.id === v.id ? null : v))
    setSelectedAeropuerto(null)
    setSelectedEnvio(null)
  }, [])

  const handleAeropuertoClick = useCallback((a: AeropuertoDTO) => {
    setSelectedAeropuerto((prev) => (prev?.codigoOACI === a.codigoOACI ? null : a))
    setSelectedVuelo(null)
    setSelectedEnvio(null)
  }, [])

  const handleEnvioSelect = useCallback((envio: EnvioEstado) => {
    setSelectedEnvio((prev) => (prev?.id === envio.id ? null : envio))
    setSelectedVuelo(null)
    setSelectedAeropuerto(null)
  }, [])

  const handleIrAVueloDesdeEnvio = useCallback((vueloId: string) => {
    const vuelo = simulationState?.vuelos.find((v) => v.id === vueloId)
    if (vuelo) {
      setSelectedVuelo(vuelo)
      setSelectedEnvio(null)
    }
  }, [simulationState])

  const [showResultados, setShowResultados] = useState(false)
  const hasShownResults = useRef(false)
  const [resultSnapshot, setResultSnapshot] = useState<SimulationState | null>(null)

  const isCompleted = simulationState?.status === 'COMPLETADA' || (simulationState && simulationState.progreso >= 100)
  const isColapsada = simulationState?.status === 'COLAPSADA'
  const isError = simulationState?.status === 'ERROR'

  // Restore config from sessionStorage on mount
  useEffect(() => {
    cargaArchivosService.obtenerAeropuertos()
      .then((data) => {
        setAeropuertosEstaticos(data)
      })
      .catch(() => {})

    const saved = sessionStorage.getItem(SIM_CONFIG_KEY)
    if (saved) {
      try {
        const cfg = JSON.parse(saved)
        if (cfg.fechaInicio) setFechaInicio(cfg.fechaInicio)
        if (cfg.horaInicio) setHoraInicio(cfg.horaInicio)
      } catch {
        // ignore parse errors
      }
    }
  }, [])

  // Detectar simulación activa al montar (permite ver simulación en otras pestañas)
  useEffect(() => {
    const wasStopped = localStorage.getItem(SIM_STOPPED_KEY)
    if (wasStopped) {
      // El usuario detuvo manualmente: limpiar estado residual y no restaurar nunca
      resetSimulation()
      setSessionId('')
      setResultSnapshot(null)
      hasShownResults.current = false
      return
    }
    let cancelled = false
    simulationService.activa().then((res) => {
      if (cancelled) return
      if (res.activa && res.sessionId) {
        setSessionId(res.sessionId)
        startPolling(res.sessionId)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [startPolling, resetSimulation])

  // Keep selected flight info synced with latest poll data
  useEffect(() => {
    if (!selectedVuelo) return
    if (simulationState?.vuelos) {
      const updated = simulationState.vuelos.find((v) => v.id === selectedVuelo.id)
      if (updated) {
        setSelectedVuelo(updated)
      } else if (simulationState.status === 'COMPLETADA') {
        setSelectedVuelo((prev) => (prev ? { ...prev, progresoVuelo: 100 } : prev))
      }
    }
  }, [simulationState?.vuelos, simulationState?.status])

  // Show results modal when simulation completes
  useEffect(() => {
    const shouldShow = simulationState && (simulationState.status === 'COMPLETADA' || simulationState.progreso >= 100)
    if (shouldShow && !hasShownResults.current) {
      hasShownResults.current = true
      setResultSnapshot({ ...simulationState })
      setShowResultados(true)
    }
  }, [simulationState])

  // Detener simulación al cerrar la pestaña
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || '/api'
    const handleBeforeUnload = () => {
      if (sessionId) {
        const url = `${API_BASE}/simulacion/detener/${sessionId}`
        navigator.sendBeacon?.(url)
        try {
          fetch(url, { method: 'POST', keepalive: true, mode: 'no-cors' })
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [sessionId])

  function formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const saveConfigToStorage = (cfg: { fechaInicio: string; horaInicio: string }) => {
    sessionStorage.setItem(SIM_CONFIG_KEY, JSON.stringify(cfg))
  }

  const clearConfigStorage = () => {
    sessionStorage.removeItem(SIM_CONFIG_KEY)
  }

  const handleIniciar = async () => {
    if (!fechaInicio || !horaInicio) {
      setError('Complete todos los campos')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const state = await simulationService.iniciar({
        duracionDias: DURACION_FIJA,
        fechaInicio,
        horaInicio,
        algoritmo,
        velocidad: 1,
      })
      if (state.status === 'ERROR') {
        setError(state.logs?.[0]?.mensaje || 'Error al iniciar simulación')
        setLoading(false)
        return
      }
      saveConfigToStorage({ fechaInicio, horaInicio })
      localStorage.removeItem(SIM_STOPPED_KEY)
      hasShownResults.current = false
      setResultSnapshot(null)
      setSessionId(state.sessionId)
      startPolling(state.sessionId, 15000)
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

  const handleDetenerConfirmado = async () => {
    if (!sessionId) return
    try {
      await simulationService.detener(sessionId)
    } catch {
      // ignore
    }
    resetSimulation()
    setSessionId('')
    setIsPaused(false)
    resetElapsedTimer()
    clearConfigStorage()
    localStorage.setItem(SIM_STOPPED_KEY, '1')
    hasShownResults.current = false
    setResultSnapshot(null)
    setShowResultados(false)
    setShowStopConfirm(false)
  }

  const handleNuevaSimulacion = () => {
    resetSimulation()
    setSessionId('')
    setIsPaused(false)
    resetElapsedTimer()
    clearConfigStorage()
    localStorage.removeItem(SIM_STOPPED_KEY)
    hasShownResults.current = false
    setResultSnapshot(null)
    setShowResultados(false)
  }

  const showActionButton = sessionId && !isColapsada && !isError

  const aeropuertos = simulationState?.aeropuertos?.length ? simulationState.aeropuertos : aeropuertosEstaticos
  const vuelos = simulationState?.vuelos || []

  const vuelosCulminados = simulationState?.vuelosCulminados ?? 0
  const vuelosEnTransitoCount = simulationState?.vuelosEnTransito ?? 0
  const vuelosCancelados = simulationState?.vuelosCancelados ?? 0

  return (
    <div className="flex flex-col gap-2">
      {/* Barra superior de parámetros + tiempos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 font-medium">Escenario:</span>
          <span className="text-sm text-gray-200 font-semibold">{DURACION_FIJA} días</span>
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

        {/* Tiempos de simulación */}
        {simulationState && (
          <div className="flex items-center gap-3 ml-4">
            <div className="flex flex-col bg-sky-950/40 border border-sky-800/40 rounded-lg px-3 py-1">
              <span className="text-[10px] text-sky-300/80 leading-tight">Tiempo real transcurrido</span>
              <span className="font-mono text-xs text-sky-200 leading-tight">{formatElapsed(elapsedRealSeconds)}</span>
            </div>
            <div className="flex flex-col bg-sky-950/40 border border-sky-800/40 rounded-lg px-3 py-1">
              <span className="text-[10px] text-sky-300/80 leading-tight">Fecha actual simulación</span>
              <span className="font-mono text-xs text-sky-200 leading-tight">{formatDateTime(simulationState?.simulationTime)}</span>
            </div>
            <div className="flex flex-col bg-sky-950/40 border border-sky-800/40 rounded-lg px-3 py-1">
              <span className="text-[10px] text-sky-300/80 leading-tight">Día</span>
              <span className="font-mono text-xs text-sky-200 leading-tight">{Math.ceil((simulationState.progreso / 100) * DURACION_FIJA)}</span>
            </div>
            <div className="flex flex-col w-[350px]">
              <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${simulationState.progreso}%` }}
                />
              </div>
              <p className="text-right text-[10px] text-gray-500 mt-0.5">{simulationState.progreso}%</p>
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-400 font-medium">{error}</span>
          )}
          {showActionButton ? (
            <div className="flex items-center gap-2">
              {!isCompleted && (
                <button
                  onClick={() => setShowStopConfirm(true)}
                  className="px-4 py-2 rounded-lg font-medium text-sm bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                >
                  Detener
                </button>
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

      {/* Mapa con contadores flotantes */}
      <div className="relative h-[calc(100vh-10rem)] bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <MapaAeropuertos
          aeropuertos={aeropuertos}
          vuelos={vuelos}
          selectedVueloId={selectedVuelo?.id || null}
          velocidad={1}
          onAeropuertoClick={handleAeropuertoClick}
          onVueloClick={handleVueloClick}
          onEnvioSelect={handleEnvioSelect}
          mapTz={mapTz}
          onMapTzChange={setMapTz}
        />

        {/* Contadores flotantes - inferior izquierda */}
        <div className="absolute bottom-4 left-4 z-[999] group">
          <div className="bg-gray-900/40 border border-gray-700/40 rounded-xl p-3 backdrop-blur-[2px] transition-all duration-300 group-hover:bg-gray-900/95 group-hover:border-gray-700 group-hover:backdrop-blur-sm group-hover:shadow-2xl">
            <h4 className="text-xs font-semibold text-gray-300 mb-2 pb-1 border-b border-gray-700/50">Estado de Vuelos</h4>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 bg-emerald-900/30 border border-emerald-800/50 rounded-lg px-2 py-1">
                <span className="text-[10px] text-emerald-400 font-medium">Culminados</span>
                <span className="text-xs font-bold text-emerald-300 bg-emerald-800/50 px-1.5 py-0.5 rounded">{vuelosCulminados}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-900/30 border border-amber-800/50 rounded-lg px-2 py-1">
                <span className="text-[10px] text-amber-400 font-medium">En Tránsito</span>
                <span className="text-xs font-bold text-amber-300 bg-amber-800/50 px-1.5 py-0.5 rounded">{vuelosEnTransitoCount}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-red-900/30 border border-red-800/50 rounded-lg px-2 py-1">
                <span className="text-[10px] text-red-400 font-medium">Cancelados</span>
                <span className="text-xs font-bold text-red-300 bg-red-800/50 px-1.5 py-0.5 rounded">{vuelosCancelados}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VueloModal vuelo={selectedVuelo} isOpen={!!selectedVuelo} onClose={() => setSelectedVuelo(null)} tzOffset={mapTz} />
      <AeropuertoModal aeropuerto={selectedAeropuerto} isOpen={!!selectedAeropuerto} onClose={() => setSelectedAeropuerto(null)} vuelos={simulationState?.vuelos} tzOffset={mapTz} />
      <EnvioModal envio={selectedEnvio} isOpen={!!selectedEnvio} onClose={() => setSelectedEnvio(null)} onIrAVuelo={handleIrAVueloDesdeEnvio} vuelos={simulationState?.vuelos} />
      <ResultadosModal
        state={resultSnapshot}
        isOpen={showResultados}
        onClose={() => setShowResultados(false)}
        onNuevaSimulacion={() => {
          setShowResultados(false)
          handleNuevaSimulacion()
        }}
      />

      {/* Modal confirmación detener */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-100 mb-2">Detener simulación</h3>
            <p className="text-gray-300 text-sm mb-6">¿Estás seguro de detener la simulación?</p>
            <div className="flex gap-3">
              <button
                onClick={handleDetenerConfirmado}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer"
              >
                Sí
              </button>
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
