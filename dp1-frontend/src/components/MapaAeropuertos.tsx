import { useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AeropuertoDTO, VueloDTO } from '../types'
import { getAirportCity, AIRPORTS_DATA } from '../data/airportsData'

interface Props {
  aeropuertos: AeropuertoDTO[]
  vuelos: VueloDTO[]
  onAeropuertoClick?: (a: AeropuertoDTO) => void
  onVueloClick?: (v: VueloDTO) => void
}

const center: [number, number] = [20, 0]

function aeropuertoColor(ocu: number, max: number): string {
  const ratio = max > 0 ? ocu / max : 0
  if (ratio < 0.6) return '#22c55e'
  if (ratio < 0.8) return '#eab308'
  return '#ef4444'
}

const AIRPLANE_BLUE = '#0ea5e9'

function getAirplaneIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5))">
      <svg width="14" height="14" viewBox="0 0 20 20">
        <polygon points="10,0 20,18 12,18 12,20 8,20 8,18 0,18" fill="${AIRPLANE_BLUE}" stroke="white" stroke-width="1"/>
      </svg>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function airportIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
      <span style="font-size:10px;font-weight:bold;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.8);white-space:nowrap;margin-top:2px;">${label}</span>
    </div>`,
    iconSize: [24, 52],
    iconAnchor: [12, 48],
  })
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

// Bearing in degrees from start to end (0 = north, 90 = east)
function bearing(from: [number, number], to: [number, number]): number {
  const dLon = (to[1] - from[1]) * Math.PI / 180
  const lat1 = from[0] * Math.PI / 180
  const lat2 = to[0] * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const θ = Math.atan2(y, x)
  return ((θ * 180 / Math.PI) + 360) % 360
}

// Simple quadratic Bezier interpolation with capped arc offset
function interpolatePosition(from: [number, number], to: [number, number], t: number): [number, number] {
  const offset = Math.min(2.0, Math.abs(to[1] - from[1]) * 0.02)
  const midLat = (from[0] + to[0]) / 2 + offset
  const midLon = (from[1] + to[1]) / 2
  const lat = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * midLat + t * t * to[0]
  const lon = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * midLon + t * t * to[1]
  return [lat, lon]
}

function applyRotation(mk: L.Marker, angle: number) {
  const el = mk.getElement()?.querySelector('div') as HTMLElement | null
  if (el) el.style.transform = `rotate(${angle}deg)`
}

function MapaAeropuertos({ aeropuertos, vuelos, onAeropuertoClick, onVueloClick }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const circleLayerRef = useRef<L.LayerGroup | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const flightMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const airportMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const maxProgressRef = useRef<Map<string, number>>(new Map())
  const flightAngleRef = useRef<Map<string, number>>(new Map())
  const airportDataRef = useRef<Map<string, AeropuertoDTO>>(new Map())
  const animRef = useRef<{
    rafId: number
    startTime: number
    duration: number
    startPositions: Map<string, [number, number]>
    targetPositions: Map<string, [number, number]>
  } | null>(null)

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: 2,
        zoomControl: true,
        preferCanvas: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 18,
      }).addTo(map)

      circleLayerRef.current = L.layerGroup().addTo(map)
      markerLayerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
    }

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current.rafId)
        animRef.current = null
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        flightMarkersRef.current.clear()
        airportMarkersRef.current.clear()
      }
    }
  }, [])

  // Update airports
  useEffect(() => {
    if (!circleLayerRef.current) return

    // Sync latest DTOs so click handler always reads current data
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
          if (current) onAeropuertoClick?.(current)
        })
        circleLayerRef.current?.addLayer(mk)
        airportMarkersRef.current.set(code, mk)
      }
    })
  }, [aeropuertos, onAeropuertoClick])

  // Update flights — RAF interpolates between polls for smooth motion
  useEffect(() => {
    if (!markerLayerRef.current) return

    const activeFlights = vuelos.filter((v) => v.progresoVuelo > 0 && v.progresoVuelo < 100)
    const activeIds = new Set(activeFlights.map((v) => v.id))

    // Remove inactive
    flightMarkersRef.current.forEach((mk, id) => {
      if (!activeIds.has(id)) {
        markerLayerRef.current?.removeLayer(mk)
        flightMarkersRef.current.delete(id)
        maxProgressRef.current.delete(id)
        flightAngleRef.current.delete(id)
      }
    })

    // Cancel any running interpolation
    if (animRef.current) {
      cancelAnimationFrame(animRef.current.rafId)
      animRef.current = null
    }

    // Compute target positions and update icons/tooltips immediately
    const targetPositions = new Map<string, [number, number]>()
    activeFlights.forEach((v) => {
      const prevMax = maxProgressRef.current.get(v.id) || 0
      const effectiveProgress = Math.max(v.progresoVuelo, prevMax)
      maxProgressRef.current.set(v.id, effectiveProgress)

      const from: [number, number] = [v.latOrigen, v.lonOrigen]
      const to: [number, number] = [v.latDestino, v.lonDestino]
      const [lat, lon] = interpolatePosition(from, to, effectiveProgress / 100)
      targetPositions.set(v.id, [lat, lon])

      const angle = bearing([v.latOrigen, v.lonOrigen], [v.latDestino, v.lonDestino])
      flightAngleRef.current.set(v.id, angle)

      let mk = flightMarkersRef.current.get(v.id)
      if (!mk) {
        // Spawn at origin airport so the plane appears to depart from the node
        mk = L.marker(from, { icon: getAirplaneIcon() })
        mk.bindTooltip(`${v.id} (${Math.round(effectiveProgress)}%)`, { direction: 'top', offset: L.point(0, -10) })
        mk.on('click', () => onVueloClick?.(v))
        markerLayerRef.current?.addLayer(mk)
        flightMarkersRef.current.set(v.id, mk)
        applyRotation(mk, angle)
      } else {
        mk.setTooltipContent(`${v.id} (${Math.round(effectiveProgress)}%)`)
      }
    })

    // Capture current positions as start positions for interpolation
    const startPositions = new Map<string, [number, number]>()
    flightMarkersRef.current.forEach((mk, id) => {
      if (activeIds.has(id)) {
        const ll = mk.getLatLng()
        startPositions.set(id, [ll.lat, ll.lng])
      }
    })
    // New flights: animate from origin (from) to current target
    activeFlights.forEach((v) => {
      if (!startPositions.has(v.id)) {
        startPositions.set(v.id, [v.latOrigen, v.lonOrigen])
      }
    })

    const duration = 150

    const animate = (time: number) => {
      if (!animRef.current) return
      const elapsed = time - animRef.current.startTime
      const t = Math.min(1, elapsed / animRef.current.duration)
      const eased = easeOutCubic(t)

      animRef.current.targetPositions.forEach((target, id) => {
        const mk = flightMarkersRef.current.get(id)
        if (!mk) return
        const start = animRef.current!.startPositions.get(id)
        if (!start) return
        const lat = start[0] + (target[0] - start[0]) * eased
        const lon = start[1] + (target[1] - start[1]) * eased
        mk.setLatLng([lat, lon])
      })

      if (t < 1) {
        animRef.current.rafId = requestAnimationFrame(animate)
      } else {
        animRef.current = null
      }
    }

    animRef.current = {
      rafId: 0,
      startTime: performance.now(),
      duration,
      startPositions,
      targetPositions,
    }
    animRef.current.rafId = requestAnimationFrame(animate)
  }, [vuelos, onVueloClick])

  return <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
}

export default memo(MapaAeropuertos)
