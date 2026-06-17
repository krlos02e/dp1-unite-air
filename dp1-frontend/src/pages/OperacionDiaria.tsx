import { useState, useEffect, useCallback } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import MapaAeropuertos from '../components/MapaAeropuertos'
import { AIRPORTS_DATA, getAirportCity } from '../data/airportsData'
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

function parseUtc(iso: string): Date {
  if (!iso) return new Date(0)
  if (iso.endsWith('Z')) return new Date(iso)
  return new Date(iso + 'Z')
}

function calcularProgreso(vuelo: VueloDTO, now: Date): number {
  const salida = parseUtc(vuelo.salidaUtc)
  const llegada = parseUtc(vuelo.llegadaUtc)
  const totalMs = llegada.getTime() - salida.getTime()
  if (totalMs <= 0) return 0
  const transcurrido = now.getTime() - salida.getTime()
  if (transcurrido < 0) return 0
  if (transcurrido > totalMs) return 100
  return (transcurrido / totalMs) * 100
}

function formatTime12h(iso: string): string {
  if (!iso) return '--'
  const d = parseUtc(iso)
  const raw = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
  return raw.replace(/a\.\s*m\.?/g, 'a.m.').replace(/p\.\s*m\.?/g, 'p.m.')
}

function getPeruTimeString(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  return formatter.format(now)
}

function getPeruDateParts(): { fecha: string; hora: string } {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00'
  return {
    fecha: `${get('year')}-${get('month')}-${get('day')}`,
    hora: `${get('hour')}:${get('minute')}`,
  }
}

const FLIGHT_DISPLAY_PERCENTAGE = 0.15

function shouldDisplayFlight(flightId: string, percentage: number): boolean {
  let hash = 0
  for (let i = 0; i < flightId.length; i++) {
    hash = flightId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const normalized = (Math.abs(hash) % 1000) / 1000
  return normalized < percentage
}

export default function OperacionDiaria() {
  const [aeropuertosEstaticos, setAeropuertosEstaticos] = useState<AeropuertoDTO[]>(aeropuertosFallback)
  const [vuelosOriginales, setVuelosOriginales] = useState<VueloDTO[]>([])
  const [vuelos, setVuelos] = useState<VueloDTO[]>([])
  const [horaPeru, setHoraPeru] = useState(getPeruTimeString())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  const [selectedVuelo, setSelectedVuelo] = useState<VueloDTO | null>(null)
  const [selectedAeropuerto, setSelectedAeropuerto] = useState<AeropuertoDTO | null>(null)

  const handleVueloClick = useCallback((v: VueloDTO) => {
    setSelectedVuelo((prev) => (prev?.id === v.id ? null : v))
  }, [])

  const handleAeropuertoClick = useCallback((a: AeropuertoDTO) => {
    setSelectedAeropuerto((prev) => (prev?.codigoOACI === a.codigoOACI ? null : a))
  }, [])

  // Cargar aeropuertos y vuelos del dataset
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [aeropuertosData, vuelosData] = await Promise.all([
          cargaArchivosService.obtenerAeropuertos(),
          cargaArchivosService.obtenerVuelos(),
        ])
        if (cancelled) return
        setAeropuertosEstaticos(aeropuertosData.length > 0 ? aeropuertosData : aeropuertosFallback)
        setVuelosOriginales(vuelosData)
        setDataLoaded(true)
        setError(null)
      } catch (err: any) {
        if (!cancelled) {
          setError('Error al cargar datos de operación diaria')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Actualizar reloj peruano cada segundo
  useEffect(() => {
    const tick = () => setHoraPeru(getPeruTimeString())
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  // Actualizar progreso de vuelos cada segundo
  useEffect(() => {
    if (!dataLoaded || vuelosOriginales.length === 0) return

    const updateFlights = () => {
      const now = new Date()
      const actualizados = vuelosOriginales.map((v) => ({
        ...v,
        progresoVuelo: calcularProgreso(v, now),
      }))
      setVuelos(actualizados)
    }

    updateFlights()
    const interval = setInterval(updateFlights, 1000)
    return () => clearInterval(interval)
  }, [dataLoaded, vuelosOriginales])

  const vuelosEnTransito = vuelos.filter((v) => v.progresoVuelo > 0 && v.progresoVuelo < 100)
  const vuelosEnTransitoVisibles = vuelosEnTransito.filter((v) => shouldDisplayFlight(v.id, FLIGHT_DISPLAY_PERCENTAGE))

  const { fecha } = getPeruDateParts()

  return (
    <div className="flex flex-col gap-2">
      {/* Barra superior: Hora actual, fecha, selector de vuelos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base text-gray-400 font-medium">Hora actual (Perú, UTC-5):</span>
          <span className="text-xl font-mono font-bold text-emerald-400">{horaPeru}</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-base text-gray-400 font-medium">Fecha:</span>
          <span className="text-xl font-mono text-gray-200">{fecha.split('-').reverse().join('/')}</span>
        </div>

        {/* Selector de vuelos activos */}
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-gray-400 font-medium">Vuelos activos:</span>
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer min-w-[200px]"
            value={selectedVuelo?.id || ''}
            onChange={(e) => {
              const vuelo = vuelos.find((v) => v.id === e.target.value)
              if (vuelo) handleVueloClick(vuelo)
              else setSelectedVuelo(null)
            }}
          >
            <option value="">Seleccionar vuelo...</option>
            {vuelosEnTransitoVisibles.map((v) => (
              <option key={v.id} value={v.id}>
                {getAirportCity(v.origen) || v.origen} → {getAirportCity(v.destino) || v.destino} ({Math.round(v.progresoVuelo)}%)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-gray-400">Cargando datos...</span>}
          {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
        </div>
      </div>

      {/* Mapa */}
      <div className="relative h-[calc(100vh-10rem)] bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-300 text-sm">Cargando vuelos del dataset...</p>
            </div>
          </div>
        )}
        <MapaAeropuertos
          aeropuertos={aeropuertosEstaticos}
          vuelos={vuelos}
          selectedVueloId={selectedVuelo?.id || null}
          velocidad={1}
          onAeropuertoClick={handleAeropuertoClick}
          onVueloClick={handleVueloClick}
        />

        {selectedVuelo && (
          <div className="absolute bottom-4 right-4 z-[1001] bg-gray-900/95 border border-gray-700 rounded-xl p-3 w-80 shadow-2xl backdrop-blur-sm">
            <h3 className="text-sm font-bold text-gray-100 mb-2">Detalle del Vuelo</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Vuelo:</span>
                <span className="font-semibold text-sky-300">{getAirportCity(selectedVuelo.origen) || selectedVuelo.origen} → {getAirportCity(selectedVuelo.destino) || selectedVuelo.destino}</span>
              </div>
              <div className="flex justify-between">
                <span>Salida:</span>
                <span className="font-mono text-gray-200">{formatTime12h(selectedVuelo.salidaUtc)}</span>
              </div>
              <div className="flex justify-between">
                <span>Llegada:</span>
                <span className="font-mono text-gray-200">{formatTime12h(selectedVuelo.llegadaUtc)}</span>
              </div>
              <div className="flex justify-between">
                <span>Progreso:</span>
                <span className="font-mono text-emerald-300">{Math.round(selectedVuelo.progresoVuelo)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Capacidad:</span>
                <span className="font-mono text-gray-200">{selectedVuelo.capacidad}</span>
              </div>
              <div className="flex justify-between">
                <span>Maletas a bordo:</span>
                <span className="font-mono text-amber-300">{selectedVuelo.cargaActual}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setSelectedVuelo(null)}
                className="text-xs text-gray-500 hover:text-red-400 cursor-pointer"
              >
                ✕ Cerrar detalle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Aeropuerto */}
      {selectedAeropuerto && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-sky-400">
                {getAirportCity(selectedAeropuerto.codigoOACI) || selectedAeropuerto.codigoOACI}
              </h3>
              <button
                onClick={() => setSelectedAeropuerto(null)}
                className="text-gray-500 hover:text-red-400 cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Vuelos Salientes */}
              <div>
                <h4 className="text-sm font-bold text-emerald-400 mb-2">Vuelos Salientes</h4>
                <div className="space-y-1">
                  {vuelosEnTransitoVisibles
                    .filter((v) => v.origen === selectedAeropuerto.codigoOACI)
                    .map((v) => (
                      <div
                        key={v.id}
                        className="flex justify-between items-center text-sm text-gray-300 bg-gray-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-700"
                        onClick={() => {
                          setSelectedAeropuerto(null)
                          handleVueloClick(v)
                        }}
                      >
                        <span>
                          {getAirportCity(v.origen) || v.origen} → {getAirportCity(v.destino) || v.destino}
                        </span>
                        <span className="font-mono text-xs text-gray-400">
                          Salida {formatTime12h(v.salidaUtc)} — Llegada {formatTime12h(v.llegadaUtc)}
                        </span>
                      </div>
                    ))}
                  {vuelosEnTransitoVisibles.filter((v) => v.origen === selectedAeropuerto.codigoOACI).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">No hay vuelos salientes visibles</p>
                  )}
                </div>
              </div>

              {/* Vuelos Entrantes */}
              <div>
                <h4 className="text-sm font-bold text-amber-400 mb-2">Vuelos Entrantes</h4>
                <div className="space-y-1">
                  {vuelosEnTransitoVisibles
                    .filter((v) => v.destino === selectedAeropuerto.codigoOACI)
                    .map((v) => (
                      <div
                        key={v.id}
                        className="flex justify-between items-center text-sm text-gray-300 bg-gray-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-700"
                        onClick={() => {
                          setSelectedAeropuerto(null)
                          handleVueloClick(v)
                        }}
                      >
                        <span>
                          {getAirportCity(v.origen) || v.origen} → {getAirportCity(v.destino) || v.destino}
                        </span>
                        <span className="font-mono text-xs text-gray-400">
                          Salida {formatTime12h(v.salidaUtc)} — Llegada {formatTime12h(v.llegadaUtc)}
                        </span>
                      </div>
                    ))}
                  {vuelosEnTransitoVisibles.filter((v) => v.destino === selectedAeropuerto.codigoOACI).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">No hay vuelos entrantes visibles</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
