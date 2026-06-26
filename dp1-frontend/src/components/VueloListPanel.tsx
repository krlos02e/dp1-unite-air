import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  type AirportLookupData,
  buildAirportLookup,
  getAirportCityResolved,
  getAirportCountryResolved,
} from '../data/airportsData'
import { cargaArchivosService } from '../services/CargaArchivosService'
import VueloProgramacionModal from './VueloProgramacionModal'
import type { VueloDTO, EnvioEstado, AeropuertoDTO, AlmacenContexto, ProgramacionVueloDTO } from '../types'
import { shouldDisplayFlight } from '../utils/flightVisibility'

interface Props {
  vuelos: VueloDTO[]
  contexto?: AlmacenContexto
  aeropuertosDisponibles?: AeropuertoDTO[]
  envios?: EnvioEstado[]
  onEnvioSelect?: (envio: EnvioEstado) => void
  selectedEnvioId?: string | null
  onVueloSelect?: (vuelo: VueloDTO) => void
  selectedVueloId?: string | null
  includeCompleted?: boolean
  showStatusFilters?: boolean
  onVisibleFlightsChange?: (flightIds: string[] | null) => void
  onDataChanged?: () => void | Promise<void>
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
}


const estadoLabel: Record<string, string> = {
  EN_ESPERA: 'En espera',
  EMBARCADO: 'Embarcado',
  EN_VUELO: 'En vuelo',
  ENTREGADO: 'Entregado',
}

const estadoColor: Record<string, string> = {
  EN_ESPERA: 'text-amber-400 bg-amber-400/10',
  EMBARCADO: 'text-sky-400 bg-sky-400/10',
  EN_VUELO: 'text-emerald-400 bg-emerald-400/10',
  ENTREGADO: 'text-gray-400 bg-gray-400/10',
}

const DEFAULT_LIMIT = 50

type SearchScope = 'todos' | 'codigo' | 'tramo' | 'origen' | 'destino'
type SortField = 'ocupacion' | 'salida' | 'llegada' | 'origen' | 'destino'
type SortDirection = 'asc' | 'desc'
type OccupationFilter = 'todos' | 'vacio' | 'normal' | 'alerta' | 'critico'

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function locationTerms(code: string, airportLookup: Map<string, AirportLookupData>): string {
  return normalizeSearch([
    code,
    getAirportCityResolved(code, airportLookup),
    getAirportCountryResolved(code, airportLookup),
  ].filter(Boolean).join(' '))
}

function createCodePatternMatcher(rawPattern: string): (code: string) => boolean {
  const pattern = normalizeSearch(rawPattern)
  if (!pattern) return () => true

  if (!pattern.includes('*') && !pattern.includes('?')) {
    return (code) => code.includes(pattern)
  }

  const expression = Array.from(pattern).map((character) => {
    if (character === '*') return '.*'
    if (character === '?') return '.'
    return /[a-z0-9_-]/.test(character) ? character : `\\${character}`
  }).join('')

  const regex = new RegExp(`^${expression}$`)
  return (code) => regex.test(code)
}

function locationLabel(code: string, airportLookup: Map<string, AirportLookupData>): string {
  const city = getAirportCityResolved(code, airportLookup)
  return city ? `${code} · ${city}` : code
}

function timeOfDay(iso: string): number {
  if (!iso) return 0
  const date = new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
  return date.getUTCHours() * 60 + date.getUTCMinutes()
}

function occupationStatus(cargaActual: number, ocupPct: number) {
  if (cargaActual <= 0) {
    return { label: 'Vacío', bar: 'bg-sky-500', text: 'text-sky-400', track: 'bg-sky-950/80' }
  }
  if (ocupPct > 90) {
    return { label: 'Crítico', bar: 'bg-red-500', text: 'text-red-400', track: 'bg-gray-800' }
  }
  if (ocupPct > 70) {
    return { label: 'Alerta', bar: 'bg-amber-500', text: 'text-amber-400', track: 'bg-gray-800' }
  }
  return { label: 'Normal', bar: 'bg-emerald-500', text: 'text-emerald-400', track: 'bg-gray-800' }
}

function occupationCategory(cargaActual: number, ocupPct: number): OccupationFilter {
  if (cargaActual <= 0) return 'vacio'
  if (ocupPct > 90) return 'critico'
  if (ocupPct > 70) return 'alerta'
  return 'normal'
}

function VueloListPanel({
  vuelos,
  contexto,
  aeropuertosDisponibles = [],
  envios,
  onEnvioSelect,
  selectedEnvioId,
  onVueloSelect,
  selectedVueloId,
  includeCompleted = false,
  showStatusFilters = true,
  onVisibleFlightsChange,
  onDataChanged,
}: Props) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>('ACTIVO')
  const [searchScope, setSearchScope] = useState<SearchScope>('todos')
  const [originFilter, setOriginFilter] = useState('')
  const [destinationFilter, setDestinationFilter] = useState('')
  const [occupationFilter, setOccupationFilter] = useState<OccupationFilter>('todos')
  const [sortField, setSortField] = useState<SortField>('ocupacion')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [programaciones, setProgramaciones] = useState<ProgramacionVueloDTO[]>([])
  const [showProgramacionForm, setShowProgramacionForm] = useState(false)
  const [editingProgramacion, setEditingProgramacion] = useState<ProgramacionVueloDTO | null>(null)
  const [deletingProgramacionId, setDeletingProgramacionId] = useState<number | null>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const airportLookup = useMemo(() => buildAirportLookup(aeropuertosDisponibles), [aeropuertosDisponibles])

  const deferredSearch = useDeferredValue(search)
  const term = normalizeSearch(deferredSearch)
  const hasListFilters = Boolean(originFilter || destinationFilter || occupationFilter !== 'todos')
  const hasMapFilters = Boolean(term || originFilter || destinationFilter || occupationFilter !== 'todos' || filterEstado !== 'ACTIVO')
  const canManageTransportUnits = Boolean(contexto)

  useEffect(() => {
    if (!contexto) return
    cargaArchivosService.obtenerProgramacionesVuelo(contexto)
      .then(setProgramaciones)
      .catch(() => {})
  }, [contexto])

  const enviosByFlight = useMemo(() => {
    const index = new Map<string, EnvioEstado[]>()
    if (!envios) return index
    envios.forEach((envio) => {
      const flightIds = new Set([envio.vueloActual, envio.vueloEsperado, envio.ultimoVuelo].filter((id): id is string => Boolean(id)))
      flightIds.forEach((flightId) => {
        const current = index.get(flightId)
        if (current) current.push(envio)
        else index.set(flightId, [envio])
      })
    })
    return index
  }, [envios])

  const visibleFlights = useMemo(
    () => vuelos.filter((flight) => (
      (
        flight.estado === 'ACTIVO'
        || (includeCompleted && flight.estado === 'CULMINADO')
        || (includeCompleted && flight.estado === 'CANCELADO')
      )
      && (
        flight.estado === 'CANCELADO'
        || Boolean(flight.editable)
        || shouldDisplayFlight(flight.id)
        || flight.id === selectedVueloId
      )
    )),
    [vuelos, selectedVueloId, includeCompleted, showStatusFilters],
  )

  const indexedFlights = useMemo(() => visibleFlights.map((flight) => {
    const codigo = normalizeSearch(flight.id)
    const origen = locationTerms(flight.origen, airportLookup)
    const destino = locationTerms(flight.destino, airportLookup)
    return {
      flight,
      codigo,
      origen,
      destino,
      tramo: `${origen} ${destino} ${normalizeSearch(`${flight.origen}-${flight.destino}`)}`,
      ocupacion: flight.capacidad > 0 ? flight.cargaActual / flight.capacidad : 0,
      ocupacionCategoria: occupationCategory(
        flight.cargaActual,
        flight.capacidad > 0 ? Math.round((flight.cargaActual / flight.capacidad) * 100) : 0,
      ),
      salida: timeOfDay(flight.salidaUtc),
      llegada: timeOfDay(flight.llegadaUtc),
      origenOrden: normalizeSearch(getAirportCountryResolved(flight.origen, airportLookup) || getAirportCityResolved(flight.origen, airportLookup) || flight.origen),
      destinoOrden: normalizeSearch(getAirportCountryResolved(flight.destino, airportLookup) || getAirportCityResolved(flight.destino, airportLookup) || flight.destino),
    }
  }), [visibleFlights, airportLookup])

  const searchCodeMatcher = useMemo(
    () => createCodePatternMatcher(deferredSearch),
    [deferredSearch],
  )

  const filtradosSinLimite = useMemo(() => {
    return indexedFlights.filter(({ flight: v, codigo, origen, destino, tramo }) => {
      if (showStatusFilters && v.estado !== filterEstado) return false
      if (originFilter && v.origen !== originFilter) return false
      if (destinationFilter && v.destino !== destinationFilter) return false
      if (occupationFilter !== 'todos' && occupationCategory(v.cargaActual, v.capacidad > 0 ? Math.round((v.cargaActual / v.capacidad) * 100) : 0) !== occupationFilter) return false
      if (!term) return true

      if (searchScope === 'codigo') return searchCodeMatcher(codigo)
      if (searchScope === 'tramo') return tramo.includes(term)
      if (searchScope === 'origen') return origen.includes(term)
      if (searchScope === 'destino') return destino.includes(term)
      return searchCodeMatcher(codigo) || tramo.includes(term)
    }).sort((a, b) => {
      let comparison: number
      if (sortField === 'ocupacion') comparison = a.ocupacion - b.ocupacion
      else if (sortField === 'salida') comparison = a.salida - b.salida
      else if (sortField === 'llegada') comparison = a.llegada - b.llegada
      else if (sortField === 'origen') comparison = a.origenOrden.localeCompare(b.origenOrden)
      else comparison = a.destinoOrden.localeCompare(b.destinoOrden)

      if (comparison === 0) comparison = a.codigo.localeCompare(b.codigo)
      return sortDirection === 'asc' ? comparison : -comparison
    }).map(({ flight }) => flight)
  }, [indexedFlights, term, filterEstado, searchScope, searchCodeMatcher, originFilter, destinationFilter, occupationFilter, sortField, sortDirection, showStatusFilters])

  const estadosDisponibles = useMemo(() => {
    const states = ['ACTIVO']
    if (includeCompleted) states.push('CULMINADO', 'CANCELADO')
    return states
  }, [includeCompleted])

  useEffect(() => {
    if (!onVisibleFlightsChange) return
    if (!hasMapFilters) {
      onVisibleFlightsChange(null)
      return
    }

    const timeoutId = window.setTimeout(() => {
      onVisibleFlightsChange(filtradosSinLimite.map((flight) => flight.id))
    }, 120)

    return () => window.clearTimeout(timeoutId)
  }, [filtradosSinLimite, hasMapFilters, onVisibleFlightsChange])

  useEffect(() => {
    if (!selectedVueloId) return
    const selected = vuelos.find((flight) => flight.id === selectedVueloId)
    if (!selected) return

    const estadosValidos = new Set(estadosDisponibles)
    if (selected.estado && estadosValidos.has(selected.estado) && selected.estado !== filterEstado) {
      setFilterEstado(selected.estado)
    }

    const visible = filtradosSinLimite.some((flight) => flight.id === selectedVueloId)
    if (!visible) return

    window.setTimeout(() => {
      rowRefs.current.get(selectedVueloId)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 0)
  }, [selectedVueloId, vuelos, estadosDisponibles, filterEstado, filtradosSinLimite])

  const resultKey = `${term}|${originFilter}|${destinationFilter}|${occupationFilter}|${filterEstado}|${searchScope}|${sortField}|${sortDirection}`
  const [page, setPage] = useState({ key: '', limit: DEFAULT_LIMIT })
  const visibleLimit = page.key === resultKey ? page.limit : DEFAULT_LIMIT
  const filtrados = filtradosSinLimite.slice(0, visibleLimit)

  const programacionesFiltradas = useMemo(() => {
    return programaciones.filter((programacion) => {
      if (originFilter && programacion.origenOACI !== originFilter) return false
      if (destinationFilter && programacion.destinoOACI !== destinationFilter) return false
      if (!term) return true

      const codigoProgramacion = normalizeSearch(
        `USR-${programacion.id ?? ''}-${programacion.origenOACI}-${programacion.destinoOACI}`
      )
      const origen = locationTerms(programacion.origenOACI, airportLookup)
      const destino = locationTerms(programacion.destinoOACI, airportLookup)
      const tramo = `${origen} ${destino} ${normalizeSearch(`${programacion.origenOACI}-${programacion.destinoOACI}`)}`

      if (searchScope === 'codigo') return searchCodeMatcher(codigoProgramacion)
      if (searchScope === 'tramo') return tramo.includes(term)
      if (searchScope === 'origen') return origen.includes(term)
      if (searchScope === 'destino') return destino.includes(term)
      return searchCodeMatcher(codigoProgramacion) || tramo.includes(term)
    })
  }, [programaciones, originFilter, destinationFilter, term, searchScope, searchCodeMatcher, airportLookup])

  const origins = useMemo(() => (
    Array.from(new Set([
      ...vuelos.map((v) => v.origen),
      ...programaciones.map((p) => p.origenOACI),
    ])).sort()
  ), [vuelos, programaciones])

  const destinations = useMemo(() => (
    Array.from(new Set([
      ...vuelos.map((v) => v.destino),
      ...programaciones.map((p) => p.destinoOACI),
    ])).sort()
  ), [vuelos, programaciones])

  const estadoVueloLabel: Record<string, string> = {
    ACTIVO: 'Activos',
    PROGRAMADO: 'Programados',
    CULMINADO: 'Culminados',
    CANCELADO: 'Cancelados',
  }

  const refreshProgramaciones = async () => {
    if (!contexto) return
    const [programacionesActualizadas] = await Promise.all([
      cargaArchivosService.obtenerProgramacionesVuelo(contexto),
      onDataChanged?.(),
    ])
    setProgramaciones(programacionesActualizadas)
  }

  const handleProgramacionSave = async (data: ProgramacionVueloDTO) => {
    if (!contexto) return
    if (editingProgramacion?.id) {
      await cargaArchivosService.actualizarProgramacionVuelo(editingProgramacion.id, data, contexto)
    } else {
      await cargaArchivosService.crearProgramacionVuelo(data, contexto)
    }
    await refreshProgramaciones()
  }

  const handleDeleteProgramacion = async (id: number) => {
    if (!contexto) return
    await cargaArchivosService.eliminarProgramacionVuelo(id, contexto)
    await refreshProgramaciones()
    setDeletingProgramacionId(null)
  }

  return (
    <div className="w-96 flex-1 min-h-0 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-200">Unidades de transporte</h3>
          {canManageTransportUnits && (
            <button
              type="button"
              onClick={() => {
                setEditingProgramacion(null)
                setShowProgramacionForm(true)
              }}
              className="text-[11px] bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded-md font-medium transition-colors"
            >
              + Nueva UT
            </button>
          )}
        </div>
        {canManageTransportUnits && (
          <div className="mb-3 rounded-lg border border-gray-800 bg-gray-950/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-gray-300">Programación recurrente diaria</span>
              <span className="text-[9px] text-gray-500">{programacionesFiltradas.length} de {programaciones.length}</span>
            </div>
            {programaciones.length === 0 ? (
              <p className="mt-1 text-[10px] text-gray-500">No hay UT creadas por interfaz en este contexto.</p>
            ) : programacionesFiltradas.length === 0 ? (
              <p className="mt-1 text-[10px] text-gray-500">No hay UT creadas por interfaz que coincidan con el filtro actual.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {programacionesFiltradas.map((programacion) => (
                  <div key={programacion.id} className="rounded-md border border-gray-800 bg-gray-900/80 px-2 py-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold text-sky-400">
                          {programacion.origenOACI} → {programacion.destinoOACI}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {programacion.horaSalidaLocal.slice(0, 5)} - {programacion.horaLlegadaLocal.slice(0, 5)} · cap. {programacion.capacidad}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProgramacion(programacion)
                            setShowProgramacionForm(true)
                          }}
                          className="text-[10px] text-gray-400 hover:text-sky-400 px-1 py-0.5 rounded transition-colors"
                          title="Editar programación"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProgramacionId(programacion.id || null)}
                          className="text-[10px] text-gray-400 hover:text-red-400 px-1 py-0.5 rounded transition-colors"
                          title="Eliminar programación"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {deletingProgramacionId === programacion.id && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => programacion.id && handleDeleteProgramacion(programacion.id)}
                          className="flex-1 rounded-md bg-red-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-500"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProgramacionId(null)}
                          className="flex-1 rounded-md bg-gray-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-gray-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-1.5">
          <select
            value={searchScope}
            onChange={(e) => setSearchScope(e.target.value as SearchScope)}
            aria-label="Buscar unidad de transporte por"
            className="w-[92px] bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
          >
            <option value="todos">Todo</option>
            <option value="codigo">Código UT</option>
            <option value="tramo">Tramo</option>
            <option value="origen">Origen</option>
            <option value="destino">Destino</option>
          </select>
          <input
            type="text"
            placeholder="Texto o patrón, ej. SPIM-*"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Término de búsqueda de unidades de transporte"
            className="min-w-0 flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2" aria-label="Semáforo de ocupación">
          {[
            ['bg-sky-500', 'Vacío'],
            ['bg-emerald-500', 'Normal'],
            ['bg-amber-500', 'Alerta'],
            ['bg-red-500', 'Crítico'],
          ].map(([color, label]) => (
            <span key={label} className="inline-flex items-center gap-1 text-[9px] text-gray-500">
              <span className={`w-1.5 h-1.5 rounded-full ${color}`} />{label}
            </span>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-gray-400">Filtros de ubicación</span>
            {hasListFilters && (
              <button
                type="button"
                onClick={() => {
                  setOriginFilter('')
                  setDestinationFilter('')
                  setOccupationFilter('todos')
                }}
                className="text-[9px] text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              aria-label="Filtrar unidades de transporte por origen"
              className="min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">Todos los orígenes</option>
                  {origins.map((code) => <option key={code} value={code}>{locationLabel(code, airportLookup)}</option>)}
            </select>
            <select
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              aria-label="Filtrar unidades de transporte por destino"
              className="min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">Todos los destinos</option>
                  {destinations.map((code) => <option key={code} value={code}>{locationLabel(code, airportLookup)}</option>)}
            </select>
          </div>
          <select
            value={occupationFilter}
            onChange={(e) => setOccupationFilter(e.target.value as OccupationFilter)}
            aria-label="Filtrar unidades de transporte por semáforo de ocupación"
            className="mt-1.5 w-full bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
          >
            <option value="todos">Todos los semáforos</option>
            <option value="vacio">Vacío</option>
            <option value="normal">Normal</option>
            <option value="alerta">Alerta</option>
            <option value="critico">Crítico</option>
          </select>
        </div>
      </div>

      {/* State filter */}
      {showStatusFilters && (
        <div className="px-3 py-1.5 border-b border-gray-800 flex gap-1 overflow-x-auto flex-nowrap">
          {estadosDisponibles.map(est => (
            <button
              key={est}
              onClick={() => setFilterEstado(est)}
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filterEstado === est
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {estadoVueloLabel[est] || est}
            </button>
          ))}
        </div>
      )}

      {/* Sorting */}
      <div className="px-3 py-1.5 border-b border-gray-800 flex items-center gap-1.5">
        <span className="text-[10px] text-gray-500 whitespace-nowrap">Ordenar:</span>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
          aria-label="Ordenar unidades de transporte por"
          className="min-w-0 flex-1 bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
        >
          <option value="ocupacion">Nivel de ocupación</option>
          <option value="salida">Hora de salida</option>
          <option value="llegada">Hora de llegada</option>
          <option value="origen">Origen</option>
          <option value="destino">Destino</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}
          className="w-7 h-6 rounded bg-gray-800 border border-gray-700 text-[11px] text-sky-400 hover:bg-gray-700 cursor-pointer"
          title={sortDirection === 'asc' ? 'Orden ascendente' : 'Orden descendente'}
          aria-label={sortDirection === 'asc' ? 'Cambiar a orden descendente' : 'Cambiar a orden ascendente'}
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filtrados.length === 0 && (
          <p className="text-center text-xs text-gray-500 py-8">
            {programacionesFiltradas.length > 0
              ? 'No hay vuelos activos para este filtro. Revisa la programación recurrente superior.'
              : term ? 'No se encontraron vuelos' : 'No hay vuelos disponibles'}
          </p>
        )}

        {filtrados.map((v) => {
          const isExpanded = expandedId === v.id
          const isFlightSelected = selectedVueloId === v.id
          const enviosEnEsteVuelo = enviosByFlight.get(v.id) ?? []
          const totalMaletas = enviosEnEsteVuelo.reduce((sum, e) => sum + e.cantidad, 0)
          const ocupPct = v.capacidad > 0 ? Math.round((v.cargaActual / v.capacidad) * 100) : 0
          const ocupacion = occupationStatus(v.cargaActual, ocupPct)
          const origenPais = getAirportCountryResolved(v.origen, airportLookup) || getAirportCityResolved(v.origen, airportLookup) || v.origen
          const destinoPais = getAirportCountryResolved(v.destino, airportLookup) || getAirportCityResolved(v.destino, airportLookup) || v.destino

          return (
            <div
              key={v.id}
              ref={(node) => {
                if (node) rowRefs.current.set(v.id, node)
                else rowRefs.current.delete(v.id)
              }}
              className="border-b border-gray-800/50"
            >
              {/* Main row */}
              <div
                onClick={() => {
                  setExpandedId(isExpanded ? null : v.id)
                  onVueloSelect?.(v)
                }}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  isFlightSelected
                    ? 'bg-amber-900/20 border-l-2 border-l-amber-400'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-mono font-semibold text-sky-400 mb-0.5" title={v.id}>
                      UT {v.origen}-{v.destino}
                    </div>
                    <div className="text-xs text-gray-200 truncate">
                      <span className="font-semibold text-emerald-400">{origenPais}</span>
                      <span className="text-gray-500 mx-0.5">→</span>
                      <span className="font-semibold text-emerald-400">{destinoPais}</span>
                      <span className="text-[10px] text-gray-500 ml-1">· {formatTime(v.salidaUtc)} - {formatTime(v.llegadaUtc)}</span>
                    </div>
                    {v.estado && (
                      <span className={`text-[9px] font-medium px-1 py-0.5 rounded-full ${estadoColor[v.estado] || 'text-gray-500'}`}>
                        {v.estado}
                      </span>
                    )}
                  </div>
                </div>

                {/* Occupation bar */}
                <div className="flex items-center gap-2 mt-1">
                  <div className={`flex-1 ${ocupacion.track} rounded-full h-2 overflow-hidden`}>
                    <div
                      className={`h-full rounded-full transition-all ${ocupacion.bar}`}
                      style={{ width: `${Math.min(ocupPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono">
                    {v.cargaActual}/{v.capacidad}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${ocupacion.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ocupacion.bar}`} />
                    {ocupacion.label} ({ocupPct}%)
                  </span>
                </div>

                {envios && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    📦 {enviosEnEsteVuelo.length} envío{enviosEnEsteVuelo.length !== 1 ? 's' : ''} · 🎒 {totalMaletas} maleta{totalMaletas !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Expanded: shipments and products on this transport unit */}
              {isExpanded && envios && (
                <div className="bg-gray-800/30 border-t border-gray-800/50">
                  {enviosEnEsteVuelo.length === 0 ? (
                    <p className="px-4 py-2 text-[10px] text-gray-500">Este vuelo no traslada envíos</p>
                  ) : (
                    <>
                      <div className="px-4 py-1.5 text-[10px] text-gray-400 font-medium border-b border-gray-800/30">
                        Envíos y productos transportados: {enviosEnEsteVuelo.length} envío{enviosEnEsteVuelo.length !== 1 ? 's' : ''} · {totalMaletas} maleta{totalMaletas !== 1 ? 's' : ''}
                      </div>
                      {enviosEnEsteVuelo.map((envio) => {
                        const isSelected = envio.id === selectedEnvioId
                        return (
                          <button
                            key={envio.id}
                            onClick={() => onEnvioSelect?.(envio)}
                            className={`w-full text-left px-4 py-1.5 border-b border-gray-800/30 transition-colors hover:bg-gray-700/30 cursor-pointer ${
                              isSelected ? 'bg-sky-900/20 border-l-2 border-l-sky-500' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <div className="text-[9px] font-mono text-sky-400 truncate">Envío {envio.id}</div>
                                <div className="text-[10px] text-gray-300 truncate">
                                  <span className="font-medium">{getAirportCityResolved(envio.origen, airportLookup) || envio.origen}</span>
                                  <span className="text-gray-600 mx-0.5">→</span>
                                  <span className="font-medium">{getAirportCityResolved(envio.destino, airportLookup) || envio.destino}</span>
                                </div>
                                <div className="text-[9px] text-gray-500">{envio.cantidad} maleta{envio.cantidad !== 1 ? 's' : ''}</div>
                              </div>
                              <span className={`text-[9px] font-medium px-1 py-0.5 rounded-full whitespace-nowrap ${estadoColor[envio.estado] || 'text-gray-500'}`}>
                                {estadoLabel[envio.estado] || envio.estado}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-gray-800 text-[10px] text-gray-600 flex justify-between items-center">
        <span>{filtrados.length} mostrados · {filtradosSinLimite.length} de {visibleFlights.length}</span>
        {filtrados.length < filtradosSinLimite.length && (
          <button
            onClick={() => setPage({ key: resultKey, limit: visibleLimit + DEFAULT_LIMIT })}
            className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
          >
            Mostrar {Math.min(DEFAULT_LIMIT, filtradosSinLimite.length - filtrados.length)} más
          </button>
        )}
      </div>

      <VueloProgramacionModal
        isOpen={showProgramacionForm}
        aeropuertos={aeropuertosDisponibles}
        programacion={editingProgramacion}
        onClose={() => {
          setShowProgramacionForm(false)
          setEditingProgramacion(null)
        }}
        onSave={handleProgramacionSave}
      />
    </div>
  )
}

export default memo(VueloListPanel)
