import { useState, useEffect, useCallback, useRef } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import MapaAeropuertos from '../components/MapaAeropuertos'
import VueloModal from '../components/VueloModal'
import AeropuertoModal from '../components/AeropuertoModal'
import EnvioModal from '../components/EnvioModal'
import EnvioListPanel from '../components/EnvioListPanel'
import MaletaListPanel from '../components/MaletaListPanel'
import MaletaModal from '../components/MaletaModal'
import AlmacenListPanel from '../components/AlmacenListPanel'
import VueloListPanel from '../components/VueloListPanel'
import { AIRPORTS_DATA } from '../data/airportsData'
import type { VueloDTO, AeropuertoDTO, EnvioEstado, MaletaEstado } from '../types'

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
  const [selectedAeropuerto, setSelectedAeropuerto] = useState<AeropuertoDTO | null>(null)
  const [selectedEnvio, setSelectedEnvio] = useState<EnvioEstado | null>(null)
  const [selectedMaleta, setSelectedMaleta] = useState<MaletaEstado | null>(null)
  const [selectedEnvioRouteMode, setSelectedEnvioRouteMode] = useState<'actual' | 'anterior'>('actual')
  const [selectedMaletaRouteMode, setSelectedMaletaRouteMode] = useState<'actual' | 'anterior'>('actual')
  const [mapTz, setMapTz] = useState(0)
  const [panelMode, setPanelMode] = useState<'envios' | 'maletas' | 'almacenes' | 'aviones'>('aviones')
  const [panelCollapsed, setPanelCollapsed] = useState(true)
  const [panelRendered, setPanelRendered] = useState(false)
  const [panelShown, setPanelShown] = useState(false)
  const [todosEnvios, setTodosEnvios] = useState<EnvioEstado[]>([])
  const [filteredFlightIds, setFilteredFlightIds] = useState<Set<string> | null>(null)
  const filteredFlightSignatureRef = useRef('')

  const handleVueloClick = useCallback((v: VueloDTO) => {
    setSelectedVuelo((prev) => (prev?.id === v.id ? null : v))
    setSelectedAeropuerto(null)
    setSelectedEnvio(null)
    setSelectedMaleta(null)
    setSelectedEnvioRouteMode('actual')
    setSelectedMaletaRouteMode('actual')
    setPanelMode('aviones')
    setPanelCollapsed(false)
  }, [])

  const handleAeropuertoClick = useCallback((a: AeropuertoDTO) => {
    setSelectedAeropuerto((prev) => (prev?.codigoOACI === a.codigoOACI ? null : a))
    setSelectedVuelo(null)
    setSelectedEnvio(null)
    setSelectedMaleta(null)
    setSelectedEnvioRouteMode('actual')
    setSelectedMaletaRouteMode('actual')
  }, [])

  const handleEnvioSelect = useCallback((envio: EnvioEstado) => {
    setSelectedEnvio((prev) => {
      if (prev?.id === envio.id) {
        setSelectedVuelo(null)
        setSelectedAeropuerto(null)
        setSelectedMaleta(null)
        setSelectedEnvioRouteMode('actual')
        return null
      }

      setSelectedEnvioRouteMode('actual')
      setSelectedMaleta(null)
      setSelectedMaletaRouteMode('actual')
      const vueloId = envio.vueloActual || envio.vueloEsperado || envio.ultimoVuelo
      const vuelo = vueloId ? vuelos.find((v) => v.id === vueloId) : null
      if (vuelo) {
        setSelectedVuelo(vuelo)
        setSelectedAeropuerto(null)
      } else {
        const aeropuerto = aeropuertosEstaticos.find((a) => a.codigoOACI === envio.aeropuertoActual)
        setSelectedVuelo(null)
        setSelectedAeropuerto(aeropuerto || null)
      }
      return envio
    })
  }, [aeropuertosEstaticos, vuelos])

  const handleMaletaSelect = useCallback((maleta: MaletaEstado) => {
    setSelectedMaleta((prev) => {
      if (prev?.id === maleta.id) {
        setSelectedVuelo(null)
        setSelectedAeropuerto(null)
        setSelectedMaletaRouteMode('actual')
        return null
      }

      setSelectedEnvio(null)
      setSelectedEnvioRouteMode('actual')
      setSelectedMaletaRouteMode('actual')
      const vueloId = maleta.vueloActual || maleta.vueloEsperado || maleta.ultimoVuelo
      const vuelo = vueloId ? vuelos.find((v) => v.id === vueloId) : null
      if (vuelo) {
        setSelectedVuelo(vuelo)
        setSelectedAeropuerto(null)
      } else {
        const aeropuerto = aeropuertosEstaticos.find((a) => a.codigoOACI === maleta.aeropuertoActual)
        setSelectedVuelo(null)
        setSelectedAeropuerto(aeropuerto || null)
      }
      return maleta
    })
  }, [aeropuertosEstaticos, vuelos])

  const handleIrAVueloDesdeEnvio = useCallback((vueloId: string) => {
    const vuelo = vuelos.find((v) => v.id === vueloId)
    if (vuelo) {
      setSelectedVuelo(vuelo)
      setSelectedEnvio(null)
      setSelectedMaleta(null)
      setSelectedEnvioRouteMode('actual')
      setSelectedMaletaRouteMode('actual')
    }
  }, [vuelos])

  const handleVisibleFlightsChange = useCallback((ids: string[] | null) => {
    if (!ids) {
      if (filteredFlightSignatureRef.current === '') return
      filteredFlightSignatureRef.current = ''
      setFilteredFlightIds(null)
      return
    }
    const signature = ids.join('|')
    if (signature === filteredFlightSignatureRef.current) return
    filteredFlightSignatureRef.current = signature
    setFilteredFlightIds(new Set(ids))
  }, [])

  const handleAeropuertosContextoChanged = useCallback((aeropuertos: AeropuertoDTO[]) => {
    setAeropuertosEstaticos(aeropuertos.length > 0 ? aeropuertos : aeropuertosFallback)
  }, [])

  const refreshOperacionContextData = useCallback(async () => {
    const [aeropuertosData, vuelosData] = await Promise.all([
      cargaArchivosService.obtenerAeropuertos('OPERACION'),
      cargaArchivosService.obtenerVuelos('OPERACION'),
    ])
    setAeropuertosEstaticos(aeropuertosData.length > 0 ? aeropuertosData : aeropuertosFallback)
    setVuelosOriginales(vuelosData)
  }, [])

  // Cargar aeropuertos y vuelos del dataset
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [aeropuertosData, vuelosData] = await Promise.all([
          cargaArchivosService.obtenerAeropuertos('OPERACION'),
          cargaArchivosService.obtenerVuelos('OPERACION'),
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

  // Polling de vuelos cada 15 segundos para reflejar cancelaciones y nuevos envíos
  useEffect(() => {
    if (!dataLoaded) return

    const pollVuelos = async () => {
      try {
        const vuelosData = await cargaArchivosService.obtenerVuelos('OPERACION')
        setVuelosOriginales(vuelosData)
      } catch {
        // ignore polling errors
      }
    }

    const pollEnvios = async () => {
      try {
        const res = await cargaArchivosService.listarEnvios(undefined, undefined, undefined)
        setTodosEnvios(res.envios)
      } catch {
        // ignore
      }
    }

    pollVuelos()
    pollEnvios()
    const interval = setInterval(() => {
      pollVuelos()
      pollEnvios()
    }, 15000)
    return () => clearInterval(interval)
  }, [dataLoaded])

  useEffect(() => {
    if (!panelCollapsed) {
      setPanelRendered(true)
      const frameId = window.requestAnimationFrame(() => setPanelShown(true))
      return () => window.cancelAnimationFrame(frameId)
    }
    setPanelShown(false)
    const timeoutId = window.setTimeout(() => setPanelRendered(false), 180)
    return () => window.clearTimeout(timeoutId)
  }, [panelCollapsed])

  const { fecha } = getPeruDateParts()

  return (
    <div className="flex flex-col gap-2">
      {/* Barra superior: hora actual y fecha */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base text-gray-400 font-medium">Hora actual (Perú, UTC-5):</span>
          <span className="text-xl font-mono font-bold text-emerald-400">{horaPeru}</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-base text-gray-400 font-medium">Fecha:</span>
          <span className="text-xl font-mono text-gray-200">{fecha.split('-').reverse().join('/')}</span>
        </div>

        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-gray-400">Cargando datos...</span>}
          {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
        </div>
      </div>

      {/* Mapa + Panel de envíos/almacenes */}
      <div className="flex gap-2 h-[calc(100vh-10rem)]">
        <div className="relative flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
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
            selectedAeropuertoId={selectedAeropuerto?.codigoOACI || null}
            selectedEnvio={selectedMaleta ?? selectedEnvio}
            selectedEnvioRouteMode={selectedMaleta ? selectedMaletaRouteMode : selectedEnvioRouteMode}
            velocidad={1}
            onAeropuertoClick={handleAeropuertoClick}
            onVueloClick={handleVueloClick}
            mapTz={mapTz}
            onMapTzChange={setMapTz}
            filteredFlightIds={panelMode === 'aviones' && !panelCollapsed ? filteredFlightIds : null}
          />
          {panelCollapsed && (
            <button
              onClick={() => setPanelCollapsed(false)}
              className="absolute top-4 right-4 z-[1000] bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white hover:bg-gray-700 transition-colors cursor-pointer"
            >
              ▶ Panel
            </button>
          )}

          <VueloModal
            vuelo={selectedVuelo}
            isOpen={!!selectedVuelo && !selectedEnvio && !selectedMaleta}
            onClose={() => setSelectedVuelo(null)}
            tzOffset={mapTz}
            aeropuertos={aeropuertosEstaticos}
          />
          <AeropuertoModal
            aeropuerto={selectedAeropuerto}
            isOpen={!!selectedAeropuerto && !selectedEnvio && !selectedMaleta}
            onClose={() => setSelectedAeropuerto(null)}
            vuelos={vuelos}
            envios={todosEnvios}
            tzOffset={mapTz}
            onVueloSelect={handleVueloClick}
            aeropuertos={aeropuertosEstaticos}
          />
          <EnvioModal
            envio={selectedEnvio}
            isOpen={!!selectedEnvio && !selectedMaleta}
            onClose={() => {
              setSelectedEnvio(null)
              setSelectedVuelo(null)
              setSelectedAeropuerto(null)
              setSelectedEnvioRouteMode('actual')
            }}
            onIrAVuelo={handleIrAVueloDesdeEnvio}
            vuelos={vuelos}
            dentroDelMapa
            routeMode={selectedEnvioRouteMode}
            onRouteModeChange={setSelectedEnvioRouteMode}
          />
          <MaletaModal
            maleta={selectedMaleta}
            isOpen={!!selectedMaleta}
            onClose={() => {
              setSelectedMaleta(null)
              setSelectedVuelo(null)
              setSelectedAeropuerto(null)
              setSelectedMaletaRouteMode('actual')
            }}
            onIrAVuelo={handleIrAVueloDesdeEnvio}
            vuelos={vuelos}
            dentroDelMapa
            routeMode={selectedMaletaRouteMode}
            onRouteModeChange={setSelectedMaletaRouteMode}
          />
        </div>
        {panelRendered && (
        <div
          className={`flex flex-col gap-2 transition-[transform,opacity] duration-200 ease-out will-change-transform ${
            panelShown ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setPanelMode('envios')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                panelMode === 'envios'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 bg-gray-800'
              }`}
            >
              📦 Envíos
            </button>
            <button
              onClick={() => setPanelMode('maletas')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                panelMode === 'maletas'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 bg-gray-800'
              }`}
            >
              🧳 Maletas
            </button>
            <button
              onClick={() => setPanelMode('almacenes')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                panelMode === 'almacenes'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 bg-gray-800'
              }`}
            >
              🏢 Almacenes
            </button>
            <button
              onClick={() => setPanelMode('aviones')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                panelMode === 'aviones'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 bg-gray-800'
              }`}
            >
              ✈️ Aviones
            </button>
            <button
              onClick={() => setPanelCollapsed(true)}
              className="px-2 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
              title="Contraer panel"
            >
              ◀
            </button>
          </div>
          {panelMode === 'almacenes' ? (
            <AlmacenListPanel
              aeropuertos={aeropuertosEstaticos}
              envios={todosEnvios}
              onEnvioSelect={handleEnvioSelect}
              selectedEnvioId={selectedEnvio?.id}
              onAlmacenSelect={handleAeropuertoClick}
              selectedAlmacenId={selectedAeropuerto?.codigoOACI}
              contexto="OPERACION"
              onDataChanged={handleAeropuertosContextoChanged}
            />
          ) : panelMode === 'aviones' ? (
            <VueloListPanel
              vuelos={vuelos}
              contexto="OPERACION"
              aeropuertosDisponibles={aeropuertosEstaticos}
              envios={todosEnvios}
              onEnvioSelect={handleEnvioSelect}
              selectedEnvioId={selectedEnvio?.id}
              onVueloSelect={handleVueloClick}
              selectedVueloId={selectedVuelo?.id}
              showStatusFilters={false}
              onVisibleFlightsChange={handleVisibleFlightsChange}
              onDataChanged={refreshOperacionContextData}
            />
          ) : panelMode === 'maletas' ? (
            <MaletaListPanel
              onMaletaSelect={handleMaletaSelect}
              selectedMaletaId={selectedMaleta?.id}
            />
          ) : (
            <EnvioListPanel
              onEnvioSelect={handleEnvioSelect}
              selectedEnvioId={selectedEnvio?.id}
              enviosExternos={todosEnvios}
            />
          )}
        </div>
        )}
      </div>

    </div>
  )
}
