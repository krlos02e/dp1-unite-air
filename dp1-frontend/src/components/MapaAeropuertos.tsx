import { useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AeropuertoDTO, VueloDTO } from '../types'

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

function vueloColor(carga: number, cap: number): string {
  const ratio = cap > 0 ? carga / cap : 0
  if (ratio < 0.4) return '#22c55e'
  if (ratio < 0.7) return '#eab308'
  return '#ef4444'
}

function airplaneIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:18px;color:#0ea5e9;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5))">✈</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function airportIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>`,
    iconSize: [24, 32],
    iconAnchor: [12, 28],
  })
}

function MapaAeropuertos({ aeropuertos, vuelos, onAeropuertoClick, onVueloClick }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const circleLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const flightMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const flightRoutesRef = useRef<Map<string, L.Polyline>>(new Map())
  const airportMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const rafRef = useRef<number>(0)
  const targetPositionsRef = useRef<Map<string, [number, number]>>(new Map())
  const currentPositionsRef = useRef<Map<string, [number, number]>>(new Map())

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
      routeLayerRef.current = L.layerGroup().addTo(map)
      markerLayerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        flightMarkersRef.current.clear()
        flightRoutesRef.current.clear()
        airportMarkersRef.current.clear()
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // Update airports
  useEffect(() => {
    if (!circleLayerRef.current) return

    const currentCodes = new Set(aeropuertos.map((a) => a.codigoOACI))
    // Remove old markers
    airportMarkersRef.current.forEach((mk, code) => {
      if (!currentCodes.has(code)) {
        circleLayerRef.current?.removeLayer(mk)
        airportMarkersRef.current.delete(code)
      }
    })

    // Add/update markers
    aeropuertos.forEach((a) => {
      const existing = airportMarkersRef.current.get(a.codigoOACI)
      const color = aeropuertoColor(a.ocupacionActual, a.capacidadMaxima)

      if (existing) {
        existing.setIcon(airportIcon(color))
      } else {
        const mk = L.marker([a.latitud, a.longitud], { icon: airportIcon(color) })
        mk.bindTooltip(`<b>${a.codigoOACI}</b><br/>Cap: ${a.ocupacionActual}/${a.capacidadMaxima}`, { direction: 'top' })
        mk.on('click', () => onAeropuertoClick?.(a))
        circleLayerRef.current?.addLayer(mk)
        airportMarkersRef.current.set(a.codigoOACI, mk)
      }
    })
  }, [aeropuertos, onAeropuertoClick])

  // Update flights and animate smoothly
  useEffect(() => {
    if (!routeLayerRef.current || !markerLayerRef.current) return

    const activeFlights = vuelos.filter((v) => v.progresoVuelo > 0 && v.progresoVuelo < 100)
    const activeIds = new Set(activeFlights.map((v) => v.id))

    // Remove old routes and markers for inactive flights
    flightRoutesRef.current.forEach((line, id) => {
      if (!activeIds.has(id)) {
        routeLayerRef.current?.removeLayer(line)
        flightRoutesRef.current.delete(id)
      }
    })
    flightMarkersRef.current.forEach((mk, id) => {
      if (!activeIds.has(id)) {
        markerLayerRef.current?.removeLayer(mk)
        flightMarkersRef.current.delete(id)
        targetPositionsRef.current.delete(id)
        currentPositionsRef.current.delete(id)
      }
    })

    // Compute target positions
    activeFlights.forEach((v) => {
      const from: [number, number] = [v.latOrigen, v.lonOrigen]
      const to: [number, number] = [v.latDestino, v.lonDestino]
      const t = v.progresoVuelo / 100
      const midLat = (from[0] + to[0]) / 2 + Math.abs(to[1] - from[1]) * 0.05
      const midLon = (from[1] + to[1]) / 2

      const lat = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * midLat + t * t * to[0]
      const lon = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * midLon + t * t * to[1]

      targetPositionsRef.current.set(v.id, [lat, lon])

      const existingLine = flightRoutesRef.current.get(v.id)
      const color = vueloColor(v.cargaActual, v.capacidad)
      if (!existingLine) {
        const line = L.polyline([from, [midLat, midLon], to], {
          color,
          weight: 1.5,
          opacity: 0.35,
          dashArray: '4, 6',
        })
        line.on('click', () => onVueloClick?.(v))
        routeLayerRef.current?.addLayer(line)
        flightRoutesRef.current.set(v.id, line)
      } else {
        existingLine.setStyle({ color })
      }

      if (!currentPositionsRef.current.has(v.id)) {
        currentPositionsRef.current.set(v.id, [lat, lon])
      }
    })

    cancelAnimationFrame(rafRef.current)

    const animate = () => {
      flightMarkersRef.current.forEach((mk, id) => {
        const target = targetPositionsRef.current.get(id)
        const current = currentPositionsRef.current.get(id)
        if (!target || !current) return

        const dx = target[0] - current[0]
        const dy = target[1] - current[1]
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 0.001) {
          const speed = Math.min(0.15, dist * 0.3)
          const angle = Math.atan2(dy, dx)
          current[0] += Math.sin(angle) * speed
          current[1] += Math.cos(angle) * speed
          mk.setLatLng(current)
        }
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    activeFlights.forEach((v) => {
      const target = targetPositionsRef.current.get(v.id)
      if (!target) return

      let mk = flightMarkersRef.current.get(v.id)
      if (!mk) {
        mk = L.marker(target, { icon: airplaneIcon() })
        mk.bindTooltip(`${v.id} (${Math.round(v.progresoVuelo)}%)`)
        mk.on('click', () => onVueloClick?.(v))
        markerLayerRef.current?.addLayer(mk)
        flightMarkersRef.current.set(v.id, mk)
        currentPositionsRef.current.set(v.id, [...target] as [number, number])
      }
    })

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [vuelos, onVueloClick])

  return <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
}

export default memo(MapaAeropuertos)
