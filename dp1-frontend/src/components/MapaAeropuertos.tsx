import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AeropuertoDTO, VueloDTO } from '../types'

interface Props {
  aeropuertos: AeropuertoDTO[]
  vuelos: VueloDTO[]
  onAeropuertoClick?: (a: AeropuertoDTO) => void
  onVueloClick?: (v: VueloDTO) => void
}

const center: [number, number] = [4.711, -74.072]

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
    html: `<div style="font-size:18px;transform:rotate(0deg);color:#0ea5e9">✈</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function interpolate(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export default function MapaAeropuertos({ aeropuertos, vuelos, onAeropuertoClick, onVueloClick }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center,
        zoom: 6,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(mapRef.current)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const circles = aeropuertos.map((a) => {
      const radius = Math.max(5000, (a.capacidadMaxima / 100) * 10000)
      const circle = L.circleMarker([a.latitud, a.longitud], {
        radius: Math.min(20, radius / 10000),
        color: aeropuertoColor(a.ocupacionActual, a.capacidadMaxima),
        fillColor: aeropuertoColor(a.ocupacionActual, a.capacidadMaxima),
        fillOpacity: 0.6,
        weight: 2,
      }).addTo(map)

      circle.bindTooltip(a.codigoOACI)
      circle.on('click', () => onAeropuertoClick?.(a))
      return circle
    })

    const polylines = vuelos.map((v) => {
      const from: [number, number] = [v.latOrigen, v.lonOrigen]
      const to: [number, number] = [v.latDestino, v.lonDestino]
      const mid = interpolate(from, to, 0.5)
      mid[0] += 2
      const line = L.polyline([from, mid, to], {
        color: vueloColor(v.cargaActual, v.capacidad),
        weight: 2,
        opacity: 0.7,
        dashArray: '5, 5',
      }).addTo(map)

      line.on('click', () => onVueloClick?.(v))
      return line
    })

    const markers = vuelos.map((v) => {
      const from: [number, number] = [v.latOrigen, v.lonOrigen]
      const to: [number, number] = [v.latDestino, v.lonDestino]
      const pos = interpolate(from, to, v.progresoVuelo / 100)
      pos[0] += 1
      const marker = L.marker(pos, { icon: airplaneIcon() }).addTo(map)
      marker.bindTooltip(`${v.id} (${Math.round(v.progresoVuelo)}%)`)
      marker.on('click', () => onVueloClick?.(v))
      return marker
    })

    return () => {
      circles.forEach((c) => c.remove())
      polylines.forEach((l) => l.remove())
      markers.forEach((m) => m.remove())
    }
  }, [aeropuertos, vuelos, onAeropuertoClick, onVueloClick])

  return <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
}
