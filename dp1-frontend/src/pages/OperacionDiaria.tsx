import { useState, useEffect, useCallback } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import MapaAeropuertos from '../components/MapaAeropuertos'
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

function formatTime(iso: string): string {
  if (!iso) return '--'
  const d = parseUtc(iso)
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
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

export default function OperacionDiaria() {
  const [aeropuertosEstaticos, setAeropuertosEstaticos] = useState<AeropuertoDTO[]>(aeropuertosFallback)
  const [vuelosOriginales, setVuelosOriginales] = useState<VueloDTO[]>([])
  const [vuelos, setVuelos] = useState<VueloDTO[]>([])
  const [horaPeru, setHoraPeru] = useState(getPeruTimeString())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  const [selectedVuelo, setSelectedVuelo] = useState<VueloDTO | null>(null)

  const handleVueloClick = useCallback((v: VueloDTO) => {
    setSelectedVuelo((prev) => (prev?.id === v.id ? null : v))
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

  const vuelosCulminados = vuelos.filter((v) => v.progresoVuelo >= 100).length
  const vuelosEnTransito = vuelos.filter((v) => v.progresoVuelo > 0 && v.progresoVuelo < 100)
  const vuelosEnTransitoCount = vuelosEnTransito.length
  const vuelosCancelados = 0

  const { fecha } = getPeruDateParts()

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior: Hora actual, fecha, selector de vuelos, detalle */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-sky-400">Operación Diaria - En Vivo</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-gray-400 font-medium">Hora actual (Perú, UTC-5):</span>
          <span className="text-sm font-mono font-bold text-emerald-400 text-lg">{horaPeru}</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-gray-400 font-medium">Fecha:</span>
          <span className="text-sm font-mono text-gray-200">{fecha.split('-').reverse().join('/')}</span>
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
            {vuelosEnTransito.map((v) => (
              <option key={v.id} value={v.id}>
                {v.origen} → {v.destino} ({Math.round(v.progresoVuelo)}%)
              </option>
            ))}
          </select>
        </div>

        {/* Panel de detalle del vuelo seleccionado */}
        {selectedVuelo && (
          <div className="flex items-center gap-3 ml-auto bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5">
            <div className="text-xs">
              <span className="text-gray-400">Vuelo:</span>{' '}
              <span className="font-semibold text-sky-300">{selectedVuelo.origen} → {selectedVuelo.destino}</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-400">Salida:</span>{' '}
              <span className="font-mono text-gray-200">{formatTime(selectedVuelo.salidaUtc)}</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-400">Llegada:</span>{' '}
              <span className="font-mono text-gray-200">{formatTime(selectedVuelo.llegadaUtc)}</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-400">Progreso:</span>{' '}
              <span className="font-mono text-emerald-300">{Math.round(selectedVuelo.progresoVuelo)}%</span>
            </div>
            <button
              onClick={() => setSelectedVuelo(null)}
              className="text-xs text-gray-500 hover:text-red-400 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {loading && <span className="text-xs text-gray-400">Cargando datos...</span>}
          {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
        </div>
      </div>

      {/* Mapa */}
      <div className="relative h-[42vh] bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
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
          onAeropuertoClick={() => {}}
          onVueloClick={handleVueloClick}
        />
      </div>

      {/* Paneles inferiores */}
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
          </div>
        </div>

        {/* Vuelos Activos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col">
          <h3 className="text-sm font-bold text-gray-100 mb-1">Vuelos Activos</h3>
          <div className="flex-1 overflow-y-auto max-h-24 space-y-1 text-xs font-mono">
            {vuelosEnTransitoCount > 0 ? (
              vuelosEnTransito
                .slice(0, 20)
                .map((v) => (
                  <div
                    key={v.id}
                    className={`cursor-pointer hover:text-sky-300 transition-colors ${
                      selectedVuelo?.id === v.id ? 'text-sky-400 font-bold' : 'text-gray-400'
                    }`}
                    onClick={() => handleVueloClick(v)}
                  >
                    {v.origen} → {v.destino} ({Math.round(v.progresoVuelo)}%)
                  </div>
                ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                {dataLoaded ? 'No hay vuelos en tránsito en este momento' : 'Cargando datos...'}
              </p>
            )}
          </div>
        </div>

        {/* Tiempo de Operación */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <h3 className="text-sm font-bold text-gray-100 mb-1">Tiempo de Operación</h3>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Hora actual (Perú):</span>
              <span className="font-mono text-gray-200">{horaPeru}</span>
            </div>
            <div className="flex justify-between">
              <span>Fecha:</span>
              <span className="font-mono text-gray-200">{fecha.split('-').reverse().join('/')}</span>
            </div>
            <div className="flex justify-between">
              <span>Total vuelos en dataset:</span>
              <span className="font-mono text-gray-200">{vuelosOriginales.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Vuelos mostrando progreso:</span>
              <span className="font-mono text-gray-200">{vuelos.filter((v) => v.progresoVuelo > 0 && v.progresoVuelo < 100).length}</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (vuelosEnTransitoCount / Math.max(1, vuelosOriginales.length)) * 100)}%` }}
              />
            </div>
            <p className="text-right text-[10px] text-gray-500 mt-1">
              {vuelosEnTransitoCount} / {vuelosOriginales.length} vuelos activos
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
