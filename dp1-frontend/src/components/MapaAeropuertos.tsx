import { useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AeropuertoDTO, VueloDTO } from '../types'
import { getAirportCity, AIRPORTS_DATA } from '../data/airportsData'

function tooltipForFlight(v: VueloDTO): string {
  const origen = getAirportCity(v.origen) || v.origen
  const destino = getAirportCity(v.destino) || v.destino
  return `Vuelo ${origen} - ${destino} (${Math.round(v.progresoVuelo)}%)`
}

interface Props {
  aeropuertos: AeropuertoDTO[]
  vuelos: VueloDTO[]
  selectedVueloId?: string | null
  onAeropuertoClick?: (a: AeropuertoDTO) => void
  onVueloClick?: (v: VueloDTO) => void
}

const center: [number, number] = [20, 0]

// ============================================================
// CONFIGURACIÓN DE PORCENTAJE DE AVIONES VISIBLES
// ============================================================
const FLIGHT_DISPLAY_PERCENTAGE = 0.05

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
  if (ratio < 0.6) return '#22c55e'
  if (ratio < 0.8) return '#eab308'
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
    html: `<div style="width:${size}px;height:${size}px;will-change:transform;${glowFilter}">
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

function applyTransform(mk: L.Marker, angle: number, scale: number) {
  const el = mk.getElement()?.querySelector('div') as HTMLElement | null
  if (el) el.style.transform = `rotate(${angle}deg) scale(${scale})`
}

function MapaAeropuertos({ aeropuertos, vuelos, selectedVueloId, onAeropuertoClick, onVueloClick }: Props) {
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
  const animRef = useRef<{
    rafId: number
    startTime: number
    duration: number
    startPositions: Map<string, [number, number]>
    targetPositions: Map<string, [number, number]>
  } | null>(null)
  const onVueloClickRef = useRef(onVueloClick)
  const onAeropuertoClickRef = useRef(onAeropuertoClick)

  onVueloClickRef.current = onVueloClick
  onAeropuertoClickRef.current = onAeropuertoClick

  // Update persistent flights cache when new data arrives
  useEffect(() => {
    if (vuelos.length > 0) {
      const persistedIds = new Set(persistentFlightsRef.current.keys())
      const incomingIds = new Set(vuelos.map((v) => v.id))

      // If no overlap with existing persisted flights, it's a new simulation → clear old
      if (persistedIds.size > 0 && ![...incomingIds].some((id) => persistedIds.has(id))) {
        persistentFlightsRef.current.clear()
        flightMarkersRef.current.forEach((mk) => markerLayerRef.current?.removeLayer(mk))
        flightMarkersRef.current.clear()
        flightAngleRef.current.clear()
      }

      // Remove from cache any flight that is no longer in incoming data (completed)
      persistedIds.forEach((id) => {
        if (!incomingIds.has(id)) {
          persistentFlightsRef.current.delete(id)
          const mk = flightMarkersRef.current.get(id)
          if (mk) {
            markerLayerRef.current?.removeLayer(mk)
            flightMarkersRef.current.delete(id)
            flightAngleRef.current.delete(id)
          }
        }
      })

      // Update cache with incoming active flights, and remove any that reached 100%
      vuelos.forEach((v) => {
        if (!shouldDisplayFlight(v.id, FLIGHT_DISPLAY_PERCENTAGE)) return
        if (v.progresoVuelo >= 100) {
          // Completed flight — remove from cache and map
          persistentFlightsRef.current.delete(v.id)
          const mk = flightMarkersRef.current.get(v.id)
          if (mk) {
            markerLayerRef.current?.removeLayer(mk)
            flightMarkersRef.current.delete(v.id)
            flightAngleRef.current.delete(v.id)
          }
        } else {
          persistentFlightsRef.current.set(v.id, v)
        }
      })
    }
  }, [vuelos])

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
        persistentFlightsRef.current.clear()
      }
    }
  }, [])

  // Update airports
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

  // Update selected flight route + origin/destiny circles
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

    flightMarkersRef.current.forEach((mk, id) => {
      const isSelected = id === selectedVueloId
      mk.setIcon(getAirplaneIcon(isSelected, zoomScaleRef.current))
      const angle = flightAngleRef.current.get(id)
      if (angle !== undefined) {
        requestAnimationFrame(() => applyTransform(mk, angle, zoomScaleRef.current))
      }
    })

    if (selectedVueloId) {
      const selectedVuelo = persistentFlightsRef.current.get(selectedVueloId) ?? vuelos.find((v) => v.id === selectedVueloId)
      if (selectedVuelo && mapRef.current) {
        const from: [number, number] = [selectedVuelo.latOrigen, selectedVuelo.lonOrigen]
        const to: [number, number] = [selectedVuelo.latDestino, selectedVuelo.lonDestino]

        selectedRouteRef.current = L.polyline([from, to], {
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
    }
  }, [selectedVueloId, vuelos])

  // Update flights — render from persistent cache so completed/paused flights stay visible
  useEffect(() => {
    if (!markerLayerRef.current) return

    const displayFlights = Array.from(persistentFlightsRef.current.values()).filter((v) => v.progresoVuelo > 0 && v.progresoVuelo < 100)
    const displayIds = new Set(displayFlights.map((v) => v.id))

    // Remove markers for flights that are no longer in display set
    flightMarkersRef.current.forEach((mk, id) => {
      if (!displayIds.has(id)) {
        markerLayerRef.current?.removeLayer(mk)
        flightMarkersRef.current.delete(id)
        flightAngleRef.current.delete(id)
      }
    })

    // Cancel any running interpolation
    if (animRef.current) {
      cancelAnimationFrame(animRef.current.rafId)
      animRef.current = null
    }

    // Capture current positions as start positions
    const startPositions = new Map<string, [number, number]>()
    flightMarkersRef.current.forEach((mk, id) => {
      if (displayIds.has(id)) {
        const ll = mk.getLatLng()
        startPositions.set(id, [ll.lat, ll.lng])
      }
    })

    // Compute target positions and update markers
    const targetPositions = new Map<string, [number, number]>()
    displayFlights.forEach((v) => {
      const from: [number, number] = [v.latOrigen, v.lonOrigen]
      const to: [number, number] = [v.latDestino, v.lonDestino]
      const [lat, lon] = interpolatePosition(from, to, v.progresoVuelo / 100)
      targetPositions.set(v.id, [lat, lon])

      const currentPos: [number, number] = startPositions.has(v.id)
        ? (startPositions.get(v.id) as [number, number])
        : [v.latOrigen, v.lonOrigen]
      const targetPos: [number, number] = targetPositions.get(v.id) as [number, number]

      let angle: number
      // If flight has completed (position ~= target), keep its route bearing
      const dx = Math.abs(currentPos[0] - targetPos[0])
      const dy = Math.abs(currentPos[1] - targetPos[1])
      if (dx < 0.0001 && dy < 0.0001) {
        angle = bearing([v.latOrigen, v.lonOrigen], [v.latDestino, v.lonDestino])
      } else {
        angle = bearing(currentPos, targetPos)
      }
      flightAngleRef.current.set(v.id, angle)

      const isSelected = v.id === selectedVueloId
      const tooltipText = tooltipForFlight(v)
      let mk = flightMarkersRef.current.get(v.id)
      if (!mk) {
        mk = L.marker(currentPos, { icon: getAirplaneIcon(isSelected, zoomScaleRef.current) })
        mk.bindTooltip(tooltipText, { direction: 'top', offset: L.point(0, -14) })
        mk.on('click', () => onVueloClickRef.current?.(v))
        markerLayerRef.current?.addLayer(mk)
        flightMarkersRef.current.set(v.id, mk)
        applyTransform(mk, angle, zoomScaleRef.current)
      } else {
        mk.setIcon(getAirplaneIcon(isSelected, zoomScaleRef.current))
        mk.setTooltipContent(tooltipText)
      }
    })

    // New flights: animate from origin
    displayFlights.forEach((v) => {
      if (!startPositions.has(v.id)) {
        startPositions.set(v.id, [v.latOrigen, v.lonOrigen])
      }
    })

    let hasMovement = false
    targetPositions.forEach((target, id) => {
      const start = startPositions.get(id)
      if (start && (Math.abs(start[0] - target[0]) > 0.0001 || Math.abs(start[1] - target[1]) > 0.0001)) {
        hasMovement = true
      }
    })

    if (!hasMovement) {
      targetPositions.forEach((target, id) => {
        const mk = flightMarkersRef.current.get(id)
        if (mk) mk.setLatLng(target)
      })
      return
    }

    const duration = 2200

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
  }, [vuelos, selectedVueloId])

  return <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
}

export default memo(MapaAeropuertos)
