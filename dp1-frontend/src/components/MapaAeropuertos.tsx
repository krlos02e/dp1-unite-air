import { useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AeropuertoDTO, VueloDTO } from '../types'
import { getAirportCity, AIRPORTS_DATA } from '../data/airportsData'

function tooltipForFlight(v: VueloDTO): string {
  const origen = getAirportCity(v.origen) || v.origen
  const destino = getAirportCity(v.destino) || v.destino
  return `Vuelo ${origen} → ${destino} (${Math.round(v.progresoVuelo)}%) — Maletas: ${v.cargaActual}/${v.capacidad}`
}

interface Props {
  aeropuertos: AeropuertoDTO[]
  vuelos: VueloDTO[]
  selectedVueloId?: string | null
  velocidad?: number
  onAeropuertoClick?: (a: AeropuertoDTO) => void
  onVueloClick?: (v: VueloDTO) => void
}

const center: [number, number] = [20, 0]

const FLIGHT_DISPLAY_PERCENTAGE = 0.15

function shouldDisplayFlight(flightId: string, percentage: number): boolean {
  let hash = 0
  for (let i = 0; i < flightId.length; i++) {
    hash = flightId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const normalized = (Math.abs(hash) % 1000) / 1000
  return normalized < percentage
}

function aeropuertoColor(ocu: number, max: number): string {
  const ratio = max > 0 ? ocu / max : 0
  if (ratio < 0.7) return '#22c55e'
  if (ratio < 0.9) return '#eab308'
  return '#ef4444'
}

const AIRPLANE_BLUE = '#38bdf8'
const AIRPLANE_SELECTED = '#facc15'
const BASE_ICON_SIZE = 22

function getAirplaneIcon(selected: boolean, scale = 1): L.DivIcon {
  const color = selected ? AIRPLANE_SELECTED : AIRPLANE_BLUE
  const size = Math.round(BASE_ICON_SIZE * scale)
  const glowFilter = selected
    ? 'filter:drop-shadow(0 0 5px #facc15) drop-shadow(0 0 10px #facc15);'
    : 'filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));'
  return L.divIcon({
    className: '',
    html: `<div class="airplane-body" style="width:${size}px;height:${size}px;will-change:transform;${glowFilter}">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 13 L9 11.5 L9 12.5 Z" fill="${color}"/>
        <path d="M23 13 L15 11.5 L15 12.5 Z" fill="${color}"/>
        <path d="M11.5 1 C11.5 1 10.2 6 10.2 12 C10.2 19 11.2 22.5 12 23 C12.8 22.5 13.8 19 13.8 12 C13.8 6 12.5 1 12.5 1 C12.5 1 12 0 12 0 C12 0 11.5 1 11.5 1 Z" fill="${color}"/>
        <path d="M10.5 18 L7.5 22.5 L10.5 20.5 Z" fill="${color}"/>
        <path d="M13.5 18 L16.5 22.5 L13.5 20.5 Z" fill="${color}"/>
        <ellipse cx="12" cy="3.5" rx="1.8" ry="2.8" fill="white" opacity="0.5"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function airportIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="width:34px;height:34px;border-radius:50%;background-color:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.5);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">
            <path d="M3.59 7h8.82a1 1 0 0 1 .902 1.433l-1.44 3a1 1 0 0 1-.901.567H5.029a1 1 0 0 1-.901-.567l-1.44-3A1 1 0 0 1 3.589 7"/>
            <path d="m6 7l-.78-2.342A.5.5 0 0 1 5.693 4h4.612a.5.5 0 0 1 .475.658L10 7M8 2v2m-2 8v9h4v-9m-7 9h18m1-16h-6l-1-1"/>
            <path d="m18 3l2 2l-2 2m-8 10h7a2 2 0 0 1 2 2v2"/>
          </g>
        </svg>
      </div>
      <span style="font-size:10px;font-weight:bold;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.8);white-space:nowrap;margin-top:2px;">${label}</span>
    </div>`,
    iconSize: [34, 54],
    iconAnchor: [17, 50],
  })
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

function applyTransform(mk: L.Marker, angle: number, scale: number) {
  const el = mk.getElement()?.querySelector('.airplane-body') as HTMLElement | null
  if (el) el.style.transform = `rotate(${angle}deg) scale(${scale})`
}

interface FlightAnim {
  from: [number, number]
  to: [number, number]
  prevProgress: number
  targetProgress: number
  startTime: number
  duration: number
}

function MapaAeropuertos({ aeropuertos, vuelos, selectedVueloId, velocidad = 1, onAeropuertoClick, onVueloClick }: Props) {
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
  const zoomScaleRef = useRef(1)
  const flightAnimsRef = useRef<Map<string, FlightAnim>>(new Map())
  const rafIdRef = useRef<number>(0)
  const velocidadRef = useRef(velocidad)
  const lastUpdateTimeRef = useRef<number>(0)
  const onVueloClickRef = useRef(onVueloClick)
  const onAeropuertoClickRef = useRef(onAeropuertoClick)
  const selectedVueloIdRef = useRef(selectedVueloId)
  const prevSelectedVueloIdRef = useRef<string | null>(null)
  const prevViewRef = useRef<{ center: L.LatLng; zoom: number } | null>(null)

  onVueloClickRef.current = onVueloClick
  onAeropuertoClickRef.current = onAeropuertoClick
  velocidadRef.current = velocidad
  selectedVueloIdRef.current = selectedVueloId

  useEffect(() => {
    if (vuelos.length === 0) {
      // Limpiar todos los aviones cuando no hay vuelos
      persistentFlightsRef.current.clear()
      flightMarkersRef.current.forEach((mk) => markerLayerRef.current?.removeLayer(mk))
      flightMarkersRef.current.clear()
      flightAngleRef.current.clear()
      flightAnimsRef.current.clear()
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
      }
    })

    vuelos.forEach((v) => {
      if (!shouldDisplayFlight(v.id, FLIGHT_DISPLAY_PERCENTAGE)) return
      if (v.progresoVuelo >= 100) {
        persistentFlightsRef.current.delete(v.id)
        const mk = flightMarkersRef.current.get(v.id)
        if (mk) {
          markerLayerRef.current?.removeLayer(mk)
          flightMarkersRef.current.delete(v.id)
          flightAngleRef.current.delete(v.id)
        }
        flightAnimsRef.current.delete(v.id)
      } else {
        persistentFlightsRef.current.set(v.id, v)
      }
    })
  }, [vuelos])

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: 2.5,
        zoomControl: true,
        preferCanvas: true,
        zoomSnap: 0.25,
        zoomDelta: 0.25,
        wheelPxPerZoomLevel: 120,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 18,
      }).addTo(map)

      circleLayerRef.current = L.layerGroup().addTo(map)
      markerLayerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map

      map.on('zoom', () => {
        const z = map.getZoom()
        const scale = Math.max(0.8, z / 2.5)
        zoomScaleRef.current = scale
        flightMarkersRef.current.forEach((mk, id) => {
          const angle = flightAngleRef.current.get(id) ?? 0
          applyTransform(mk, angle, scale)
        })
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

      if (existing) {
        existing.setIcon(airportIcon(color, label))
        existing.setLatLng([lat, lon])
      } else {
        const code = a.codigoOACI
        const mk = L.marker([lat, lon], { icon: airportIcon(color, label) })
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

    if (selectedVueloId) {
      const selectedVuelo = persistentFlightsRef.current.get(selectedVueloId) ?? vuelos.find((v) => v.id === selectedVueloId)
      if (selectedVuelo && mapRef.current) {
        if (prevSelectedVueloIdRef.current === null) {
          prevViewRef.current = { center: mapRef.current.getCenter(), zoom: mapRef.current.getZoom() }
          const from: [number, number] = [selectedVuelo.latOrigen, selectedVuelo.lonOrigen]
          const to: [number, number] = [selectedVuelo.latDestino, selectedVuelo.lonDestino]
          const pos = interpolatePosition(from, to, selectedVuelo.progresoVuelo / 100)
          mapRef.current.setView(pos, Math.min(mapRef.current.getZoom() + 1, 5), { animate: false })
        }

        const from: [number, number] = [selectedVuelo.latOrigen, selectedVuelo.lonOrigen]
        const to: [number, number] = [selectedVuelo.latDestino, selectedVuelo.lonDestino]
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
    } else {
      if (prevSelectedVueloIdRef.current !== null && prevViewRef.current && mapRef.current) {
        mapRef.current.setView(prevViewRef.current.center, prevViewRef.current.zoom, { animate: false })
        prevViewRef.current = null
      }
    }

    prevSelectedVueloIdRef.current = selectedVueloId ?? null

    flightMarkersRef.current.forEach((mk, id) => {
      const isSelected = id === selectedVueloId
      mk.setIcon(getAirplaneIcon(isSelected, zoomScaleRef.current))
      const angle = flightAngleRef.current.get(id)
      if (angle !== undefined) {
        requestAnimationFrame(() => applyTransform(mk, angle, zoomScaleRef.current))
      }
    })
  }, [selectedVueloId, vuelos])

  useEffect(() => {
    if (!markerLayerRef.current) return

    const now = performance.now()
    const pollInterval = 3000 / velocidadRef.current
    const animDuration = pollInterval * 1.1

    const displayFlights = Array.from(persistentFlightsRef.current.values()).filter((v) => v.progresoVuelo > 0 && v.progresoVuelo < 100)
    const displayIds = new Set(displayFlights.map((v) => v.id))

    flightMarkersRef.current.forEach((mk, id) => {
      if (!displayIds.has(id)) {
        markerLayerRef.current?.removeLayer(mk)
        flightMarkersRef.current.delete(id)
        flightAngleRef.current.delete(id)
        flightAnimsRef.current.delete(id)
      }
    })

    displayFlights.forEach((v) => {
      const from: [number, number] = [v.latOrigen, v.lonOrigen]
      const to: [number, number] = [v.latDestino, v.lonDestino]
      const isSelected = v.id === selectedVueloIdRef.current
      const tooltipText = tooltipForFlight(v)

      const existingAnim = flightAnimsRef.current.get(v.id)
      const prevProgress = existingAnim ? existingAnim.targetProgress : v.progresoVuelo

      flightAnimsRef.current.set(v.id, {
        from,
        to,
        prevProgress,
        targetProgress: v.progresoVuelo,
        startTime: now,
        duration: animDuration,
      })

      let mk = flightMarkersRef.current.get(v.id)
      if (!mk) {
        const startPos = interpolatePosition(from, to, prevProgress / 100)
        mk = L.marker(startPos, { icon: getAirplaneIcon(isSelected, zoomScaleRef.current) })
        mk.bindTooltip(tooltipText, { direction: 'top', offset: L.point(0, -14) })
        mk.on('click', () => onVueloClickRef.current?.(v))
        markerLayerRef.current?.addLayer(mk)
        flightMarkersRef.current.set(v.id, mk)

        const angle = bearing(
          interpolatePosition(from, to, Math.max(0, prevProgress / 100 - 0.01)),
          interpolatePosition(from, to, Math.min(1, prevProgress / 100 + 0.01))
        )
        flightAngleRef.current.set(v.id, angle)
        applyTransform(mk, angle, zoomScaleRef.current)
      } else {
        mk.setIcon(getAirplaneIcon(isSelected, zoomScaleRef.current))
        mk.setTooltipContent(tooltipText)
      }
    })

    lastUpdateTimeRef.current = now
  }, [vuelos])

  useEffect(() => {
    const animate = (time: number) => {
      flightAnimsRef.current.forEach((anim, id) => {
        const mk = flightMarkersRef.current.get(id)
        if (!mk) return

        const elapsed = time - anim.startTime
        const t = Math.min(1, elapsed / anim.duration)
        const currentProgress = anim.prevProgress + (anim.targetProgress - anim.prevProgress) * t
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
        applyTransform(mk, angle, zoomScaleRef.current)
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

  return <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
}

export default memo(MapaAeropuertos)
