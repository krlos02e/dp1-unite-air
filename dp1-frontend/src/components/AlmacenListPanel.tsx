import { useState, useEffect, useMemo } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import { getAirportCity, getAirportCountry } from '../data/airportsData'
import AlmacenFormModal from './AlmacenFormModal'
import type { AeropuertoDTO, EnvioEstado, AlmacenDTO } from '../types'

interface Props {
  aeropuertos: AeropuertoDTO[]
  envios?: EnvioEstado[]
  onEnvioSelect?: (envio: EnvioEstado) => void
  selectedEnvioId?: string | null
  onAlmacenSelect?: (almacen: AeropuertoDTO) => void
  selectedAlmacenId?: string | null
}

const DEFAULT_LIMIT = 50

export default function AlmacenListPanel({ aeropuertos, envios, onEnvioSelect, selectedEnvioId, onAlmacenSelect, selectedAlmacenId }: Props) {
  const [search, setSearch] = useState('')
  const [expandedOACI, setExpandedOACI] = useState<string | null>(null)
  const [almacenesDB, setAlmacenesDB] = useState<AlmacenDTO[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingAlmacen, setEditingAlmacen] = useState<AlmacenDTO | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    cargaArchivosService.obtenerAlmacenes()
      .then(setAlmacenesDB)
      .catch(() => {})
  }, [])

  const almacenMap = useMemo(() => {
    const map = new Map<string, AlmacenDTO>()
    almacenesDB.forEach(a => map.set(a.codigoOACI, a))
    return map
  }, [almacenesDB])

  const term = search.toLowerCase().trim()
  const filtradosSinLimite = aeropuertos.filter(a => {
    if (!term) return true
    const ciudad = (a.ciudad || getAirportCity(a.codigoOACI) || '').toLowerCase()
    const codigo = a.codigoOACI.toLowerCase()
    return ciudad.includes(term) || codigo.includes(term)
  })
  const filtrados = showAll || term ? filtradosSinLimite : filtradosSinLimite.slice(0, DEFAULT_LIMIT)

  const enviosEnAlmacen = (codigo: string): EnvioEstado[] => {
    if (!envios) return []
    return envios.filter(e => e.aeropuertoActual === codigo)
  }

  const handleSave = async (data: AlmacenDTO) => {
    if (editingAlmacen) {
      await cargaArchivosService.actualizarAlmacen(data.codigoOACI, data)
    } else {
      await cargaArchivosService.crearAlmacen(data)
    }
    const updated = await cargaArchivosService.obtenerAlmacenes()
    setAlmacenesDB(updated)
  }

  const handleDelete = async (codigo: string) => {
    try {
      await cargaArchivosService.eliminarAlmacen(codigo)
      const updated = await cargaArchivosService.obtenerAlmacenes()
      setAlmacenesDB(updated)
      setDeleteConfirm(null)
    } catch {
      // ignore
    }
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

  return (
    <div className="w-80 flex-1 min-h-0 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-200">Almacenes</h3>
          <button
            onClick={() => { setEditingAlmacen(null); setShowForm(true) }}
            className="text-[11px] bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded-md font-medium transition-colors"
          >
            + Nuevo
          </button>
        </div>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filtrados.length === 0 && (
          <p className="text-center text-xs text-gray-500 py-8">
            {term ? 'No se encontraron almacenes' : 'No hay almacenes disponibles'}
          </p>
        )}

        {filtrados.map((a) => {
          const isExpanded = expandedOACI === a.codigoOACI
          const isSelected = selectedAlmacenId === a.codigoOACI
          const almacenDB = almacenMap.get(a.codigoOACI)
          const ciudad = a.ciudad || getAirportCity(a.codigoOACI) || ''
          const pais = a.pais || getAirportCountry(a.codigoOACI) || ''
          const ocupPct = a.capacidadMaxima > 0 ? Math.round((a.ocupacionActual / a.capacidadMaxima) * 100) : 0
          const enviosAqui = enviosEnAlmacen(a.codigoOACI)

          return (
            <div key={a.codigoOACI} className="border-b border-gray-800/50">
              {/* Main row */}
              <div
                onClick={() => {
                  setExpandedOACI(isExpanded ? null : a.codigoOACI)
                  onAlmacenSelect?.(a)
                }}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-amber-900/20 border-l-2 border-l-amber-400'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-200 truncate">
                      <span className="font-semibold text-emerald-400">{a.codigoOACI}</span>
                      {ciudad && <span className="text-gray-400 ml-1">· {ciudad}{pais ? `, ${pais}` : ''}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingAlmacen(almacenDB || {
                        codigoOACI: a.codigoOACI,
                        ciudad, pais: a.pais || '',
                        continente: '',
                        gmtOffsetMinutos: 0,
                        capacidadMaxima: a.capacidadMaxima,
                        latitud: a.latitud,
                        longitud: a.longitud,
                      }); setShowForm(true) }}
                      className="text-[10px] text-gray-500 hover:text-sky-400 px-1 py-0.5 rounded transition-colors"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(a.codigoOACI) }}
                      className="text-[10px] text-gray-500 hover:text-red-400 px-1 py-0.5 rounded transition-colors"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Occupation bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        ocupPct > 90 ? 'bg-red-500' : ocupPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(ocupPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono">
                    {a.ocupacionActual}/{a.capacidadMaxima}
                  </span>
                  <span className={`text-[10px] font-mono font-medium ${
                    ocupPct > 90 ? 'text-red-400' : ocupPct > 70 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    ({ocupPct}%)
                  </span>
                </div>

                {envios && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    📦 {enviosAqui.length} envío{enviosAqui.length !== 1 ? 's' : ''} en almacén
                  </div>
                )}
              </div>

              {/* Expanded: envios in this warehouse */}
              {isExpanded && envios && (
                <div className="bg-gray-800/30 border-t border-gray-800/50">
                  {enviosAqui.length === 0 ? (
                    <p className="px-4 py-2 text-[10px] text-gray-500">No hay envíos en este almacén</p>
                  ) : (
                    enviosAqui.map((envio) => {
                      const isSelected = envio.id === selectedEnvioId
                      const ut = envio.vueloActual || envio.vueloEsperado
                      return (
                        <button
                          key={envio.id}
                          onClick={() => onEnvioSelect?.(envio)}
                          className={`w-full text-left px-4 py-1.5 border-b border-gray-800/30 transition-colors hover:bg-gray-700/30 ${
                            isSelected ? 'bg-sky-900/20 border-l-2 border-l-sky-500' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] text-gray-300 truncate">
                                <span className="font-medium">{getAirportCity(envio.origen) || envio.origen}</span>
                                <span className="text-gray-600 mx-0.5">→</span>
                                <span className="font-medium">{getAirportCity(envio.destino) || envio.destino}</span>
                              </div>
                              {ut && (
                                <div className="text-[9px] text-gray-500 truncate">UT: {ut}</div>
                              )}
                              <div className="text-[9px] text-gray-500">{envio.cantidad} maleta{envio.cantidad !== 1 ? 's' : ''}</div>
                            </div>
                            <span className={`text-[9px] font-medium px-1 py-0.5 rounded-full whitespace-nowrap ${estadoColor[envio.estado] || 'text-gray-500'}`}>
                              {estadoLabel[envio.estado] || envio.estado}
                            </span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-gray-800 text-[10px] text-gray-600 flex justify-between items-center">
        <span>{filtrados.length} de {aeropuertos.length} almacenes</span>
        {!showAll && !term && aeropuertos.length > DEFAULT_LIMIT && (
          <button onClick={() => setShowAll(true)} className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer">
            Mostrar todos
          </button>
        )}
      </div>

      {/* Form Modal */}
      <AlmacenFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingAlmacen(null) }}
        onSave={handleSave}
        almacen={editingAlmacen}
      />

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-100 mb-2">Eliminar almacén</h3>
            <p className="text-gray-300 text-sm mb-6">
              ¿Estás seguro de eliminar el almacén <span className="font-semibold text-red-400">{deleteConfirm}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
