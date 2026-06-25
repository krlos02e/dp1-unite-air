import { useState, useEffect, useMemo, useCallback } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import { getAirportCity } from '../data/airportsData'
import { TIMEZONE_OPTIONS, formatTimeInTimezone, formatDateInTimezone, extractUtcTime } from '../utils/timezoneFormat'
import type { VueloDTO } from '../types'

export default function CancelacionVuelos() {
  const [vuelos, setVuelos] = useState<VueloDTO[]>([])
  const [cancelados, setCancelados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [filtroId, setFiltroId] = useState('')
  const [filtroOrigen, setFiltroOrigen] = useState('')
  const [filtroDestino, setFiltroDestino] = useState('')
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)
  const [tz, setTz] = useState(0)

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      const [vuelosData, canceladosData] = await Promise.all([
        cargaArchivosService.obtenerVuelos('OPERACION'),
        cargaArchivosService.obtenerVuelosCancelados(),
      ])
      setVuelos(vuelosData)
      setCancelados(new Set(canceladosData))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const vuelosProgramados = useMemo(() => {
    return vuelos.filter(v => {
      if (cancelados.has(v.id)) return false
      return v.estado === 'PROGRAMADO'
    })
  }, [vuelos, cancelados])

  const vuelosFiltrados = useMemo(() => {
    return vuelosProgramados.filter(v => {
      if (filtroId && !v.id.toLowerCase().includes(filtroId.toLowerCase())) return false
      if (filtroOrigen) {
        const ciudad = getAirportCity(v.origen) || v.origen
        if (!ciudad.toLowerCase().includes(filtroOrigen.toLowerCase())) return false
      }
      if (filtroDestino) {
        const ciudad = getAirportCity(v.destino) || v.destino
        if (!ciudad.toLowerCase().includes(filtroDestino.toLowerCase())) return false
      }
      return true
    })
  }, [vuelosProgramados, filtroId, filtroOrigen, filtroDestino])

  const handleCancelar = async (vuelo: VueloDTO) => {
    setCancelandoId(vuelo.id)
    setMensaje(null)
    try {
      const horaSalida = extractUtcTime(vuelo.salidaUtc)
      const result = await cargaArchivosService.cancelarVuelo(vuelo.origen, vuelo.destino, horaSalida)
      if (result.success) {
        setMensaje({ tipo: 'success', texto: `Vuelo ${vuelo.id} cancelado correctamente` })
        await cargarDatos()
      } else {
        setMensaje({ tipo: 'error', texto: result.message })
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al cancelar el vuelo' })
    } finally {
      setCancelandoId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-400">Cargando vuelos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-200">Vuelos disponibles para cancelación</h3>
        <span className="text-sm text-gray-400">{vuelosFiltrados.length} vuelo(s) programado(s)</span>
      </div>

      {mensaje && (
        <div className={`px-4 py-2 rounded-lg text-sm ${mensaje.tipo === 'success' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' : 'bg-red-900/50 text-red-400 border border-red-700'}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Buscar por ID de vuelo..."
          value={filtroId}
          onChange={(e) => setFiltroId(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
        />
        <input
          type="text"
          placeholder="Buscar por ciudad de origen..."
          value={filtroOrigen}
          onChange={(e) => setFiltroOrigen(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
        />
        <input
          type="text"
          placeholder="Buscar por ciudad de destino..."
          value={filtroDestino}
          onChange={(e) => setFiltroDestino(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400 whitespace-nowrap">Zona horaria:</label>
        <select
          value={tz}
          onChange={(e) => setTz(Number(e.target.value))}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500 max-w-xs"
        >
          {TIMEZONE_OPTIONS.map(opt => (
            <option key={opt.offset} value={opt.offset}>{opt.label}</option>
          ))}
        </select>
      </div>

      {vuelosFiltrados.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          {vuelosProgramados.length === 0
            ? 'No hay vuelos programados disponibles para cancelar'
            : 'No se encontraron vuelos con ese filtro'}
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {vuelosFiltrados.map(v => {
            const origenCiudad = getAirportCity(v.origen) || v.origen
            const destinoCiudad = getAirportCity(v.destino) || v.destino
            const isCancelando = cancelandoId === v.id

            return (
              <div key={v.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{v.id}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-400">
                      <span>Origen: <span className="text-emerald-400">{origenCiudad}</span></span>
                      <span>Destino: <span className="text-red-400">{destinoCiudad}</span></span>
                      <span>Fecha: <span className="text-gray-300">{formatDateInTimezone(v.salidaUtc, tz)}</span></span>
                      <span>Salida: <span className="text-gray-300">{formatTimeInTimezone(v.salidaUtc, tz)}</span></span>
                      <span>Llegada: <span className="text-gray-300">{formatTimeInTimezone(v.llegadaUtc, tz)}</span></span>
                      <span>Capacidad: <span className="text-gray-300">{v.capacidad}</span></span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelar(v)}
                    disabled={isCancelando}
                    className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {isCancelando ? 'Cancelando...' : 'Cancelar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
