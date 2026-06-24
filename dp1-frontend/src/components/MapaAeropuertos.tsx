import {useEffect, useRef, useState, memo, useMemo} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AeropuertoDTO, VueloDTO } from '../types'
import { getAirportCity, AIRPORTS_DATA } from '../data/airportsData'
import { TIMEZONE_OPTIONS } from '../utils/timezoneFormat'
import { shouldDisplayFlight } from '../utils/flightVisibility'

function tooltipForFlight(v: VueloDTO): string {
  const origen = getAirportCity(v.origen) || v.origen
  const destino = getAirportCity(v.destino) || v.destino
  return `<b>${v.id}</b><br>${origen} → ${destino}<br>Progreso: ${Math.round(calcularProgresoLocal(v, new Date()))}%<br>Maletas: ${v.cargaActual}/${v.capacidad}`
}

interface Props {
  aeropuertos: AeropuertoDTO[]
  vuelos: VueloDTO[]
  selectedVueloId?: string | null
  selectedAeropuertoId?: string | null
  velocidad?: number
  onAeropuertoClick?: (a: AeropuertoDTO) => void
  onVueloClick?: (v: VueloDTO) => void
  mapTz: number
  onMapTzChange: (tz: number) => void
  simulationMode?: boolean
  filteredFlightIds?: Set<string> | null
}

const INITIAL_CENTER: [number, number] = [17, 0]
const WORLD_BOUNDS = L.latLngBounds(L.latLng(-60, -160), L.latLng(82, 160))

function aeropuertoColor(ocu: number, max: number): string {
  const ratio = max > 0 ? ocu / max : 0
  if (ratio <= 0) return '#38bdf8'
  if (ratio <= 0.7) return '#22c55e'
  if (ratio <= 0.9) return '#eab308'
  return '#ef4444'
}

const AIRPLANE_COLOR_GREEN = '#22c55e'
const AIRPLANE_COLOR_YELLOW = '#eab308'
const AIRPLANE_COLOR_RED = '#ef4444'
const AIRPLANE_SELECTED = '#facc15'
const BASE_ICON_SIZE = 29
const AIRPORT_ICON_RATIO = 0.9

function getAirplaneColor(cargaActual: number, capacidad: number): string {
  if (capacidad <= 0 || cargaActual <= 0) return '#38bdf8'
  const ratio = cargaActual / capacidad
  if (ratio <= 0.7) return AIRPLANE_COLOR_GREEN
  if (ratio <= 0.9) return AIRPLANE_COLOR_YELLOW
  return AIRPLANE_COLOR_RED
}

function getAirplaneIcon(selected: boolean, cargaActual: number, capacidad: number): L.DivIcon {
  const color = selected ? AIRPLANE_SELECTED : getAirplaneColor(cargaActual, capacidad)
  const size = BASE_ICON_SIZE
  const glowFilter = selected
    ? 'filter:drop-shadow(0 0 5px #facc15) drop-shadow(0 0 10px #facc15);'
    : 'filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));'
  return L.divIcon({
    className: '',
    html: `<div class="airplane-body" style="width:${size}px;height:${size}px;will-change:transform;${glowFilter}">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 13 L10.2 8.5 L10.5 12.5 Z" fill="${color}"/>
        <path d="M23 13 L13.8 8.5 L13.5 12.5 Z" fill="${color}"/>
        <path d="M11.5 1 C11.5 1 10.2 6 10.2 12 C10.2 19 11.2 22.5 12 23 C12.8 22.5 13.8 19 13.8 12 C13.8 6 12.5 1 12.5 1 C12.5 1 12 0 12 0 C12 0 11.5 1 11.5 1 Z" fill="${color}"/>
        <path d="M10.2 18 L7 23.5 L10.2 22 Z" fill="${color}"/>
        <path d="M13.8 18 L17 23.5 L13.8 22 Z" fill="${color}"/>
        <ellipse cx="12" cy="3.5" rx="1.8" ry="2.8" fill="white" opacity="0.5"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function airportIcon(color: string, label: string, selected = false): L.DivIcon {
  const r = AIRPORT_ICON_RATIO
  const circleSize = Math.round(34 * r)
  const svgSize = Math.round(22 * r)
  const borderWidth = Math.max(1, Math.round(2 * r))
  const markerColor = selected ? AIRPLANE_SELECTED : color
  const glow = selected
    ? 'box-shadow:0 0 6px #facc15,0 0 14px #facc15,0 0 24px rgba(250,204,21,0.65);'
    : 'box-shadow:0 2px 6px rgba(0,0,0,0.5);'
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="width:${circleSize}px;height:${circleSize}px;border-radius:50%;background-color:${markerColor};border:${borderWidth}px solid white;display:flex;align-items:center;justify-content:center;${glow}">
        <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">
            <path d="M3.59 7h8.82a1 1 0 0 1 .902 1.433l-1.44 3a1 1 0 0 1-.901.567H5.029a1 1 0 0 1-.901-.567l-1.44-3A1 1 0 0 1 3.589 7"/>
            <path d="m6 7l-.78-2.342A.5.5 0 0 1 5.693 4h4.612a.5.5 0 0 1 .475.658L10 7M8 2v2m-2 8v9h4v-9m-7 9h18m1-16h-6l-1-1"/>
            <path d="m18 3l2 2l-2 2m-8 10h7a2 2 0 0 1 2 2v2"/>
          </g>
        </svg>
      </div>
      <span style="font-size:${Math.max(8, Math.round(10 * r))}px;font-weight:bold;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.8);white-space:nowrap;margin-top:${Math.max(1, Math.round(2 * r))}px;">${label}</span>
    </div>`,
    iconSize: [Math.round(34 * r), Math.round(54 * r)],
    iconAnchor: [Math.round(17 * r), Math.round(50 * r)],
  })
}

function parseUtc(iso: string): Date {
  if (!iso) return new Date(0)
  if (iso.endsWith('Z')) return new Date(iso)
  return new Date(iso + 'Z')
}

function calcularProgresoLocal(v: VueloDTO, now: Date): number {
  const salida = parseUtc(v.salidaUtc)
  const llegada = parseUtc(v.llegadaUtc)
  const totalMs = llegada.getTime() - salida.getTime()
  if (totalMs <= 0) return 0
  const transcurrido = now.getTime() - salida.getTime()
  if (transcurrido < 0) return 0
  if (transcurrido > totalMs) return 100
  return (transcurrido / totalMs) * 100
}

function bearing(from: [number, number], to: [number, number]): number {
  const dLon = (to[1] - from[1]) * Math.PI / 180
  const lat1 = from[0] * Math.PI / 180
  const lat2 = to[0] * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const θ = Math.atan2(y, x)
  return ((θ * 180 / Math.PI) + 360) % 360
}

function interpolatePosition(from: [number, number], to: [number, number], t: number): [number, number] {
  const offset = Math.min(2.0, Math.abs(to[1] - from[1]) * 0.02)
  const midLat = (from[0] + to[0]) / 2 + offset
  const midLon = (from[1] + to[1]) / 2
  const lat = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * midLat + t * t * to[0]
  const lon = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * midLon + t * t * to[1]
  return [lat, lon]
}

function bezierPoints(from: [number, number], to: [number, number], steps: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    pts.push(interpolatePosition(from, to, i / steps))
  }
  return pts
}

function applyTransform(mk: L.Marker, angle: number) {
  const el = mk.getElement()?.querySelector('.airplane-body') as HTMLElement | null
  if (el) el.style.transform = `rotate(${angle}deg)`
}

interface RoutePair {
  pending: L.Polyline
  flown: L.Polyline | null
}

interface FlightAnim {
  vuelo: VueloDTO
  from: [number, number]
  to: [number, number]
  pts?: [number, number][]
  displayedProgress: number
  startProgress: number
  targetProgress: number
  transitionStartedAt: number
  transitionDurationMs: number
  snapshotAt: number
  lastRouteIndex: number
}

function animatedProgress(anim: FlightAnim, now: number): number {
  const elapsed = now - anim.transitionStartedAt
  const fraction = Math.min(1, Math.max(0, elapsed / anim.transitionDurationMs))
  return anim.startProgress + (anim.targetProgress - anim.startProgress) * fraction
}

function MapaAeropuertos({ aeropuertos, vuelos, selectedVueloId, selectedAeropuertoId, velocidad = 1, onAeropuertoClick, onVueloClick, mapTz, onMapTzChange, simulationMode = false, filteredFlightIds = null }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const circleLayerRef = useRef<L.LayerGroup | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const flightMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const airportMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const flightAngleRef = useRef<Map<string, number>>(new Map())
  const airportDataRef = useRef<Map<string, AeropuertoDTO>>(new Map())
  const persistentFlightsRef = useRef<Map<string, VueloDTO>>(new Map())
  const selectedRouteRef = useRef<L.Polyline | null>(null)
  const selectedOriginRef = useRef<L.CircleMarker | null>(null)
  const selectedDestRef = useRef<L.CircleMarker | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLinesRef = useRef<Map<string, RoutePair>>(new Map())
  const flightAnimsRef = useRef<Map<string, FlightAnim>>(new Map())
  const visibleFlightIdsRef = useRef<Set<string>>(new Set())
  const rafIdRef = useRef<number>(0)
  const lastAnimationFrameRef = useRef(0)
  const velocidadRef = useRef(velocidad)
  const onVueloClickRef = useRef(onVueloClick)
  const onAeropuertoClickRef = useRef(onAeropuertoClick)
  const selectedVueloIdRef = useRef(selectedVueloId)
  const selectedAeropuertoIdRef = useRef(selectedAeropuertoId)
  const prevSelectionRef = useRef<string | null>(null)
  const prevViewRef = useRef<{ center: L.LatLng; zoom: number } | null>(null)
  const [showRouteLines, setShowRouteLines] = useState(true)
  const showRouteLinesRef = useRef(showRouteLines)
  const isZoomingRef = useRef(false)

  const dynamicZoom = useMemo(() => {
    const z = 2 + window.innerWidth / 2000
    return Math.round(z * 4) / 4
  }, [])
  useEffect(() => {
    onVueloClickRef.current = onVueloClick
    onAeropuertoClickRef.current = onAeropuertoClick
    velocidadRef.current = velocidad
    selectedVueloIdRef.current = selectedVueloId
    selectedAeropuertoIdRef.current = selectedAeropuertoId
    showRouteLinesRef.current = showRouteLines
  }, [onVueloClick, onAeropuertoClick, velocidad, selectedVueloId, selectedAeropuertoId, showRouteLines])

  function removeRoute(id: string) {
    const pair = routeLinesRef.current.get(id)
    if (!pair) return
    routeLayerRef.current?.removeLayer(pair.pending)
    if (pair.flown) routeLayerRef.current?.removeLayer(pair.flown)
    routeLinesRef.current.delete(id)
  }

  function removeAllRoutes() {
    routeLinesRef.current.forEach((pair) => {
      routeLayerRef.current?.removeLayer(pair.pending)
      if (pair.flown) routeLayerRef.current?.removeLayer(pair.flown)
    })
    routeLinesRef.current.clear()
  }

  useEffect(() => {
    if (vuelos.length === 0) {
      // Limpiar todos los aviones cuando no hay vuelos
      persistentFlightsRef.current.clear()
      flightMarkersRef.current.forEach((mk) => markerLayerRef.current?.removeLayer(mk))
      flightMarkersRef.current.clear()
      flightAngleRef.current.clear()
      flightAnimsRef.current.clear()
      removeAllRoutes()
      return
    }

    const persistedIds = new Set(persistentFlightsRef.current.keys())
    const incomingIds = new Set(vuelos.map((v) => v.id))

    if (persistedIds.size > 0 && ![...incomingIds].some((id) => persistedIds.has(id))) {
      persistentFlightsRef.current.clear()
      flightMarkersRef.current.forEach((mk) => markerLayerRef.current?.removeLayer(mk))
      flightMarkersRef.current.clear()
      flightAngleRef.current.clear()
      flightAnimsRef.current.clear()
      removeAllRoutes()
    }

    persistedIds.forEach((id) => {
      if (!incomingIds.has(id)) {
        persistentFlightsRef.current.delete(id)
        const mk = flightMarkersRef.current.get(id)
        if (mk) {
          markerLayerRef.current?.removeLayer(mk)
          flightMarkersRef.current.delete(id)
          flightAngleRef.current.delete(id)
        }
        flightAnimsRef.current.delete(id)
        removeRoute(id)
      }
    })

    const realNow = simulationMode ? null : new Date()
    vuelos.forEach((v) => {
      const progresoLocal = simulationMode ? v.progresoVuelo : calcularProgresoLocal(v, realNow!)
      const isActive = simulationMode
        ? v.estado === 'ACTIVO'
        : progresoLocal > 0 && progresoLocal < 100
      const isVisible = shouldDisplayFlight(v.id) || v.id === selectedVueloId
      if (!isActive || !isVisible) {
        persistentFlightsRef.current.delete(v.id)
        const mk = flightMarkersRef.current.get(v.id)
        if (mk) {
          markerLayerRef.current?.removeLayer(mk)
          flightMarkersRef.current.delete(v.id)
          flightAngleRef.current.delete(v.id)
        }
        flightAnimsRef.current.delete(v.id)
        removeRoute(v.id)
      } else {
        persistentFlightsRef.current.set(v.id, v)
      }
    })
  }, [vuelos, selectedVueloId, simulationMode])

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: INITIAL_CENTER,
        zoom: dynamicZoom,
        zoomControl: true,
        preferCanvas: true,
        zoomSnap: 0.25,
        zoomDelta: 0.25,
        wheelPxPerZoomLevel: 120,
        minZoom: Math.max(2, dynamicZoom - 0.5),
        maxZoom: 13,
        maxBounds: WORLD_BOUNDS,
        maxBoundsViscosity: 1.0
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 13,
      }).addTo(map)

      circleLayerRef.current = L.layerGroup().addTo(map)
      routeLayerRef.current = L.layerGroup().addTo(map)
      markerLayerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map

      map.on('zoom', () => {
        flightMarkersRef.current.forEach((mk, id) => {
          const angle = flightAngleRef.current.get(id) ?? 0
          applyTransform(mk, angle)
        })
      })

      map.on('zoomstart', () => {
        isZoomingRef.current = true
        routeLinesRef.current.forEach((pair) => {
          pair.pending.setStyle({ opacity: 0 })
          if (pair.flown) pair.flown.setStyle({ opacity: 0 })
        })
      })

      map.on('zoomend', () => {
        routeLinesRef.current.forEach((pair) => {
          pair.pending.setStyle({ opacity: showRouteLinesRef.current ? 0.25 : 0 })
          if (pair.flown) pair.flown.setStyle({ opacity: showRouteLinesRef.current ? 0 : 0 })
        })
        isZoomingRef.current = false
        map.setMaxBounds(WORLD_BOUNDS)
      })
    }

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize()
      }
    })
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current)
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        flightMarkersRef.current.clear()
        airportMarkersRef.current.clear()
        persistentFlightsRef.current.clear()
        flightAnimsRef.current.clear()
      }
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!circleLayerRef.current) return

    airportDataRef.current.clear()
    aeropuertos.forEach((a) => airportDataRef.current.set(a.codigoOACI, a))

    const currentCodes = new Set(aeropuertos.map((a) => a.codigoOACI))
    airportMarkersRef.current.forEach((mk, code) => {
      if (!currentCodes.has(code)) {
        circleLayerRef.current?.removeLayer(mk)
        airportMarkersRef.current.delete(code)
      }
    })

    aeropuertos.forEach((a) => {
      const existing = airportMarkersRef.current.get(a.codigoOACI)
      const color = aeropuertoColor(a.ocupacionActual, a.capacidadMaxima)
      const cityName = a.ciudad || getAirportCity(a.codigoOACI) || a.codigoOACI
      const label = cityName

      const staticData = AIRPORTS_DATA[a.codigoOACI]
      const lat = (a.latitud && a.latitud !== 0) ? a.latitud : (staticData?.latitud ?? 0)
      const lon = (a.longitud && a.longitud !== 0) ? a.longitud : (staticData?.longitud ?? 0)

      const airportTooltip = () => {
        const ratio = a.capacidadMaxima > 0 ? a.ocupacionActual / a.capacidadMaxima : 0
        return `<b>${a.codigoOACI} - ${cityName}</b><br>Ocupación: ${a.ocupacionActual} / ${a.capacidadMaxima} (${Math.round(ratio * 100)}%)`
      }

      if (existing) {
        existing.setIcon(airportIcon(color, label, a.codigoOACI === selectedAeropuertoIdRef.current))
        existing.setLatLng([lat, lon])
        existing.setTooltipContent(airportTooltip())
      } else {
        const code = a.codigoOACI
        const mk = L.marker([lat, lon], { icon: airportIcon(color, label, code === selectedAeropuertoIdRef.current) })
        mk.bindTooltip(airportTooltip(), { direction: 'top', offset: L.point(0, -14) })
        mk.on('click', () => {
          const current = airportDataRef.current.get(code)
          if (current) onAeropuertoClickRef.current?.(current)
        })
        circleLayerRef.current?.addLayer(mk)
        airportMarkersRef.current.set(code, mk)
      }
    })
  }, [aeropuertos])

  useEffect(() => {
    if (!mapRef.current) return

    if (selectedRouteRef.current) {
      mapRef.current.removeLayer(selectedRouteRef.current)
      selectedRouteRef.current = null
    }
    if (selectedOriginRef.current) {
      mapRef.current.removeLayer(selectedOriginRef.current)
      selectedOriginRef.current = null
    }
    if (selectedDestRef.current) {
      mapRef.current.removeLayer(selectedDestRef.current)
      selectedDestRef.current = null
    }

    const selection = selectedVueloId
      ? `vuelo:${selectedVueloId}`
      : selectedAeropuertoId
        ? `aeropuerto:${selectedAeropuertoId}`
        : null

    if (selection && prevSelectionRef.current === null) {
      prevViewRef.current = { center: mapRef.current.getCenter(), zoom: mapRef.current.getZoom() }
    }

    if (selectedVueloId) {
      const selectedVuelo = persistentFlightsRef.current.get(selectedVueloId) ?? vuelos.find((v) => v.id === selectedVueloId)
      if (selectedVuelo && mapRef.current) {
        const from: [number, number] = [selectedVuelo.latOrigen, selectedVuelo.lonOrigen]
        const to: [number, number] = [selectedVuelo.latDestino, selectedVuelo.lonDestino]
        const anim = flightAnimsRef.current.get(selectedVueloId)
        const progress = anim?.displayedProgress ?? selectedVuelo.progresoVuelo
        const pos = interpolatePosition(from, to, progress / 100)
        if (selection !== prevSelectionRef.current) {
          mapRef.current.setView(pos, Math.min(mapRef.current.getZoom() + 1, 5), { animate: true })
        }
        const pts = bezierPoints(from, to, 40)

        selectedRouteRef.current = L.polyline(pts, {
          dashArray: '6, 8',
          color: '#facc15',
          weight: 2.5,
          opacity: 0.9,
        }).addTo(mapRef.current)

        selectedOriginRef.current = L.circleMarker(from, {
          radius: 8,
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(mapRef.current)

        selectedDestRef.current = L.circleMarker(to, {
          radius: 8,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(mapRef.current)
      }
    } else if (selectedAeropuertoId) {
      const marker = airportMarkersRef.current.get(selectedAeropuertoId)
      if (marker && selection !== prevSelectionRef.current) {
        mapRef.current.setView(marker.getLatLng(), Math.min(mapRef.current.getZoom() + 1, 5), { animate: true })
      }
    } else if (prevSelectionRef.current !== null && prevViewRef.current) {
      mapRef.current.setView(prevViewRef.current.center, prevViewRef.current.zoom, { animate: true })
      prevViewRef.current = null
    }

    prevSelectionRef.current = selection

    const vueloMap = new Map(vuelos.map((v) => [v.id, v]))
    flightMarkersRef.current.forEach((mk, id) => {
      const isSelected = id === selectedVueloId
      const v = vueloMap.get(id) || persistentFlightsRef.current.get(id)
      const carga = v?.cargaActual ?? 0
      const cap = v?.capacidad ?? 1
      mk.setIcon(getAirplaneIcon(isSelected, carga, cap))
      const angle = flightAngleRef.current.get(id)
      if (angle !== undefined) {
        requestAnimationFrame(() => applyTransform(mk, angle))
      }
    })

    const airportMap = new Map(aeropuertos.map((a) => [a.codigoOACI, a]))
    airportMarkersRef.current.forEach((mk, code) => {
      const airport = airportMap.get(code)
      if (!airport) return
      const cityName = airport.ciudad || getAirportCity(code) || code
      const color = aeropuertoColor(airport.ocupacionActual, airport.capacidadMaxima)
      mk.setIcon(airportIcon(color, cityName, code === selectedAeropuertoId))
    })
  }, [selectedVueloId, selectedAeropuertoId, vuelos, aeropuertos])

  useEffect(() => {
    if (!markerLayerRef.current) return

    const realNow = new Date()
    const frameNow = performance.now()

    const displayFlights = Array.from(persistentFlightsRef.current.values()).filter((v) => {
      const progreso = simulationMode ? v.progresoVuelo : calcularProgresoLocal(v, realNow)
      const passesPanelFilter = !filteredFlightIds || filteredFlightIds.has(v.id) || v.id === selectedVueloIdRef.current
      return progreso > 0 && progreso < 100 && passesPanelFilter
    })
    const displayIds = new Set(displayFlights.map((v) => v.id))
    visibleFlightIdsRef.current = displayIds

      flightMarkersRef.current.forEach((mk, id) => {
        if (!displayIds.has(id)) {
          mk.setOpacity(0)
          const element = mk.getElement()
          if (element) element.style.pointerEvents = 'none'
          const route = routeLinesRef.current.get(id)
          route?.pending.setStyle({ opacity: 0 })
          route?.flown?.setStyle({ opacity: 0 })
        }
      })

    displayFlights.forEach((v) => {
      const from: [number, number] = [v.latOrigen, v.lonOrigen]
      const to: [number, number] = [v.latDestino, v.lonDestino]
      const isSelected = v.id === selectedVueloIdRef.current
      const tooltipText = tooltipForFlight(v)
      const pts = bezierPoints(from, to, 40)
      const progresoActual = simulationMode ? v.progresoVuelo : calcularProgresoLocal(v, realNow)
      const tNorm = progresoActual / 100

      const existingAnim = flightAnimsRef.current.get(v.id)
      if (existingAnim) {
        const currentProgress = simulationMode
          ? animatedProgress(existingAnim, frameNow)
          : progresoActual
        const snapshotInterval = Math.min(20_000, Math.max(1_000, frameNow - existingAnim.snapshotAt))
        existingAnim.vuelo = v
        existingAnim.from = from
        existingAnim.to = to
        existingAnim.pts = pts
        existingAnim.displayedProgress = currentProgress
        existingAnim.startProgress = currentProgress
        existingAnim.targetProgress = Math.max(currentProgress, progresoActual)
        existingAnim.transitionStartedAt = frameNow
        existingAnim.transitionDurationMs = simulationMode ? snapshotInterval : 1
        existingAnim.snapshotAt = frameNow
      } else {
        flightAnimsRef.current.set(v.id, {
          vuelo: v,
          from,
          to,
          pts,
          displayedProgress: progresoActual,
          startProgress: progresoActual,
          targetProgress: progresoActual,
          transitionStartedAt: frameNow,
          transitionDurationMs: 1,
          snapshotAt: frameNow,
          lastRouteIndex: -1,
        })
      }

      let mk = flightMarkersRef.current.get(v.id)
      if (!mk) {
        const startPos = interpolatePosition(from, to, tNorm)
        mk = L.marker(startPos, { icon: getAirplaneIcon(isSelected, v.cargaActual, v.capacidad) })
        mk.bindTooltip(tooltipText, { direction: 'top', offset: L.point(0, -14) })
        const flightId = v.id
        mk.on('click', () => {
          const current = flightAnimsRef.current.get(flightId)?.vuelo
          if (current) onVueloClickRef.current?.(current)
        })
        markerLayerRef.current?.addLayer(mk)
        flightMarkersRef.current.set(v.id, mk)

        const angle = bearing(
          interpolatePosition(from, to, Math.max(0, tNorm - 0.01)),
          interpolatePosition(from, to, Math.min(1, tNorm + 0.01))
        )
        flightAngleRef.current.set(v.id, angle)
        applyTransform(mk, angle)
      } else {
        mk.setOpacity(1)
        const element = mk.getElement()
        if (element) element.style.pointerEvents = 'auto'
        mk.setIcon(getAirplaneIcon(isSelected, v.cargaActual, v.capacidad))
        mk.setTooltipContent(tooltipText)
      }


    })
  }, [vuelos, selectedVueloId, simulationMode, filteredFlightIds])

  useEffect(() => {
    routeLinesRef.current.forEach((pair) => {
      pair.pending.setStyle({ opacity: showRouteLines ? 0.25 : 0 })
      if (pair.flown) pair.flown.setStyle({ opacity: showRouteLines ? 0.08 : 0 })
    })
  }, [showRouteLines])

  useEffect(() => {
    const animate = (frameNow: number) => {
      if (frameNow - lastAnimationFrameRef.current < 33) {
        rafIdRef.current = requestAnimationFrame(animate)
        return
      }
      lastAnimationFrameRef.current = frameNow
      const realNow = simulationMode ? null : new Date()
      flightAnimsRef.current.forEach((anim, id) => {
        if (!visibleFlightIdsRef.current.has(id)) return
        const mk = flightMarkersRef.current.get(id)
        if (!mk) return

        const currentProgress = simulationMode ? animatedProgress(anim, frameNow) : calcularProgresoLocal(anim.vuelo, realNow!)
        anim.displayedProgress = currentProgress
        if (currentProgress >= 100) {
          markerLayerRef.current?.removeLayer(mk)
          flightMarkersRef.current.delete(id)
          flightAngleRef.current.delete(id)
          flightAnimsRef.current.delete(id)
          removeRoute(id)
          return
        }

        const tNorm = currentProgress / 100
        const pos = interpolatePosition(anim.from, anim.to, tNorm)
        mk.setLatLng(pos)

        const delta = 0.005
        const tBefore = Math.max(0, tNorm - delta)
        const tAfter = Math.min(1, tNorm + delta)
        const posBefore = interpolatePosition(anim.from, anim.to, tBefore)
        const posAfter = interpolatePosition(anim.from, anim.to, tAfter)
        const angle = bearing(posBefore, posAfter)
        flightAngleRef.current.set(id, angle)
        applyTransform(mk, angle)

        if (!isZoomingRef.current && anim.pts) {
          const splitIndex = Math.round(tNorm * (anim.pts.length - 1))
          const pair = routeLinesRef.current.get(id)

          if (!pair) {
            if (showRouteLinesRef.current) {
              const pendingLine = L.polyline(anim.pts, {
                dashArray: '4, 6',
                color: '#6b7280',
                weight: 1.5,
                opacity: 0.25,
              })
              routeLayerRef.current?.addLayer(pendingLine)
              const newPair: RoutePair = { pending: pendingLine, flown: null }
              if (splitIndex > 0) {
                const flownPts = anim.pts.slice(0, splitIndex + 1)
                const flownLine = L.polyline(flownPts, {
                  dashArray: '1, 8',
                  color: '#6b7280',
                  weight: 1.5,
                  opacity: 0,
                  lineCap: 'round',
                })
                routeLayerRef.current?.addLayer(flownLine)
                newPair.flown = flownLine
              }
              routeLinesRef.current.set(id, newPair)
            }
            anim.lastRouteIndex = splitIndex
            return
          }

          if (splitIndex === anim.lastRouteIndex) return
          anim.lastRouteIndex = splitIndex

          if (splitIndex < anim.pts.length) {
            pair.pending.setLatLngs(anim.pts.slice(splitIndex))
            pair.pending.setStyle({ opacity: showRouteLinesRef.current ? 0.25 : 0 })
          }
          if (splitIndex > 0) {
            const flownPts = anim.pts.slice(0, splitIndex + 1)
            if (pair.flown) {
              pair.flown.setLatLngs(flownPts)
              pair.flown.setStyle({ opacity: showRouteLinesRef.current ? 0 : 0 })
            } else {
              const flownLine = L.polyline(flownPts, {
                dashArray: '1, 8',
                color: '#6b7280',
                weight: 1.5,
                opacity: showRouteLinesRef.current ? 0 : 0,
                lineCap: 'round',
              })
              routeLayerRef.current?.addLayer(flownLine)
              pair.flown = flownLine
            }
          }
        }
      })

      rafIdRef.current = requestAnimationFrame(animate)
    }

    rafIdRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
    }
  }, [])

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 right-2 z-[1000] bg-gray-800/90 rounded-lg border border-gray-600 p-2 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-300">Rutas</span>
          <button
            onClick={() => setShowRouteLines(!showRouteLines)}
            className={`relative w-10 h-5 rounded-full transition-colors ${showRouteLines ? 'bg-emerald-500' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showRouteLines ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-300">Zona horaria:</span>
          <select
            value={mapTz}
            onChange={(e) => onMapTzChange(Number(e.target.value))}
            className="bg-gray-700 text-xs text-white rounded px-1 py-0.5 border border-gray-600 focus:outline-none focus:border-sky-500"
          >
            {TIMEZONE_OPTIONS.map(opt => (
              <option key={opt.offset} value={opt.offset}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>



      <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
    </div>
  )
}

export default memo(MapaAeropuertos)
