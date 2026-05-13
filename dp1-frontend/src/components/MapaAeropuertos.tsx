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

const center: [number, number] = [4.711, -74.072]
const THROTTLE_MS = 4000

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

function dataKey(arr: AeropuertoDTO[] | VueloDTO[]): string {
  if (arr.length === 0) return ''
  if ('codigoOACI' in arr[0]) {
    return (arr as AeropuertoDTO[]).map(x => x.codigoOACI + x.ocupacionActual).join(',')
  }
  return (arr as VueloDTO[]).map(x => x.id + x.progresoVuelo + x.cargaActual).join(',')
}

function MapaAeropuertos({ aeropuertos, vuelos, onAeropuertoClick, onVueloClick }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const circleLayerRef = useRef<L.LayerGroup>(L.layerGroup())
  const routeLayerRef = useRef<L.LayerGroup>(L.layerGroup())
  const markerLayerRef = useRef<L.LayerGroup>(L.layerGroup())
  const lastUpdateRef = useRef(0)
  const prevKeyRef = useRef('')

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: 6,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map)

      circleLayerRef.current.addTo(map)
      routeLayerRef.current.addTo(map)
      markerLayerRef.current.addTo(map)
      mapRef.current = map
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const currentKey = dataKey(aeropuertos) + '|' + dataKey(vuelos)
    if (currentKey === prevKeyRef.current) return
    const now = Date.now()
    if (now - lastUpdateRef.current < THROTTLE_MS) return
    lastUpdateRef.current = now
    prevKeyRef.current = currentKey

    circleLayerRef.current.clearLayers()
    routeLayerRef.current.clearLayers()
    markerLayerRef.current.clearLayers()

    const circles = aeropuertos.map((a) => {
      const radius = Math.max(5000, (a.capacidadMaxima / 100) * 10000)
      const circle = L.circleMarker([a.latitud, a.longitud], {
        radius: Math.min(20, radius / 10000),
        color: aeropuertoColor(a.ocupacionActual, a.capacidadMaxima),
        fillColor: aeropuertoColor(a.ocupacionActual, a.capacidadMaxima),
        fillOpacity: 0.6,
        weight: 2,
      })
      circle.bindTooltip(a.codigoOACI)
      circle.on('click', () => onAeropuertoClick?.(a))
      return circle
    })
    circles.forEach((c) => circleLayerRef.current.addLayer(c))

    const polylines = vuelos.map((v) => {
      const from: [number, number] = [v.latOrigen, v.lonOrigen]
      const to: [number, number] = [v.latDestino, v.lonDestino]
      const mid: [number, number] = [(from[0] + to[0]) / 2 + 2, (from[1] + to[1]) / 2]
      const line = L.polyline([from, mid, to], {
        color: vueloColor(v.cargaActual, v.capacidad),
        weight: 2,
        opacity: 0.7,
        dashArray: '5, 5',
      })
      line.on('click', () => onVueloClick?.(v))
      return line
    })
    polylines.forEach((l) => routeLayerRef.current.addLayer(l))

    const markers = vuelos.map((v) => {
      const from: [number, number] = [v.latOrigen, v.lonOrigen]
      const to: [number, number] = [v.latDestino, v.lonDestino]
      const t = v.progresoVuelo / 100
      const pos: [number, number] = [from[0] + (to[0] - from[0]) * t + 1, from[1] + (to[1] - from[1]) * t]
      const marker = L.marker(pos, { icon: airplaneIcon() })
      marker.bindTooltip(`${v.id} (${Math.round(v.progresoVuelo)}%)`)
      marker.on('click', () => onVueloClick?.(v))
      return marker
    })
    markers.forEach((m) => markerLayerRef.current.addLayer(m))
  }, [aeropuertos, vuelos, onAeropuertoClick, onVueloClick])

  return <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
}

export default memo(MapaAeropuertos)
