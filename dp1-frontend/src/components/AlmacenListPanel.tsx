import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import { getAirportCity, getAirportCountry } from '../data/airportsData'
import AlmacenFormModal from './AlmacenFormModal'
import AeropuertoDetailCard from './AeropuertoDetailCard'
import type { AeropuertoDTO, EnvioEstado, AlmacenDTO, AlmacenContexto, VueloDTO } from '../types'

interface Props {
  aeropuertos: AeropuertoDTO[]
  envios?: EnvioEstado[]
  onEnvioSelect?: (envio: EnvioEstado) => void
  selectedEnvioId?: string | null
  onAlmacenSelect?: (almacen: AeropuertoDTO) => void
  selectedAlmacenId?: string | null
  selectedAlmacen?: AeropuertoDTO | null
  vuelos?: VueloDTO[]
  onVueloSelect?: (vuelo: VueloDTO) => void
  contexto: AlmacenContexto
  onDataChanged?: (aeropuertos: AeropuertoDTO[]) => void | Promise<void>
  onVisibleAirportsChange?: (airportCodes: string[] | null) => void
  tzOffset?: number
  onSelectedAlmacenClear?: () => void
}

const DEFAULT_LIMIT = 50
type SearchScope = 'todos' | 'codigo' | 'ciudad' | 'pais'
type OccupationFilter = 'todos' | 'vacio' | 'normal' | 'alerta' | 'critico'

interface CombinedWarehouse extends AeropuertoDTO {
  continente?: string
}

const COUNTRY_TO_CONTINENT: Record<string, string> = {
  colombia: 'AMERICA',
  ecuador: 'AMERICA',
  venezuela: 'AMERICA',
  brasil: 'AMERICA',
  peru: 'AMERICA',
  bolivia: 'AMERICA',
  chile: 'AMERICA',
  argentina: 'AMERICA',
  paraguay: 'AMERICA',
  uruguay: 'AMERICA',
  albania: 'EUROPA',
  alemania: 'EUROPA',
  austria: 'EUROPA',
  belgica: 'EUROPA',
  bielorrusia: 'EUROPA',
  bulgaria: 'EUROPA',
  checa: 'EUROPA',
  croacia: 'EUROPA',
  dinamarca: 'EUROPA',
  holanda: 'EUROPA',
  india: 'ASIA',
  siria: 'ASIA',
  'arabia saudita': 'ASIA',
  afganistan: 'ASIA',
  oman: 'ASIA',
  yemen: 'ASIA',
  azerbaiyan: 'ASIA',
  jordania: 'ASIA',
  'emiratos arabes unidos': 'ASIA',
  pakistan: 'ASIA',
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
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

function inferContinent(almacen?: AlmacenDTO, airport?: AeropuertoDTO): string {
  if (almacen?.continente) return almacen.continente
  const country = normalizeSearch(almacen?.pais || airport?.pais || getAirportCountry(airport?.codigoOACI || '') || '')
  return COUNTRY_TO_CONTINENT[country] || 'OTRO'
}

function occupationCategory(ocupacionActual: number, capacidadMaxima: number): OccupationFilter {
  if (capacidadMaxima <= 0 || ocupacionActual <= 0) return 'vacio'
  const ratio = ocupacionActual / capacidadMaxima
  if (ratio > 0.9) return 'critico'
  if (ratio > 0.7) return 'alerta'
  return 'normal'
}

export default function AlmacenListPanel({
  aeropuertos,
  envios,
  onEnvioSelect,
  selectedEnvioId,
  onAlmacenSelect,
  selectedAlmacenId,
  selectedAlmacen,
  vuelos = [],
  onVueloSelect,
  contexto,
  onDataChanged,
  onVisibleAirportsChange,
  tzOffset = 0,
  onSelectedAlmacenClear,
}: Props) {
  const [search, setSearch] = useState('')
  const [searchScope, setSearchScope] = useState<SearchScope>('todos')
  const [codePatternFilter, setCodePatternFilter] = useState('')
  const [continentFilter, setContinentFilter] = useState('todos')
  const [occupationFilter, setOccupationFilter] = useState<OccupationFilter>('todos')
  const [expandedOACI, setExpandedOACI] = useState<string | null>(null)
  const [almacenesDB, setAlmacenesDB] = useState<AlmacenDTO[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingAlmacen, setEditingAlmacen] = useState<AlmacenDTO | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [detalleEnviosOACI, setDetalleEnviosOACI] = useState<string | null>(null)
  const [detallePaquetesOACI, setDetallePaquetesOACI] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    cargaArchivosService.obtenerAlmacenes(contexto)
      .then(setAlmacenesDB)
      .catch(() => {})
  }, [contexto])

  const deferredSearch = useDeferredValue(search)

  const almacenMap = useMemo(() => {
    const map = new Map<string, AlmacenDTO>()
    almacenesDB.forEach(a => map.set(a.codigoOACI, a))
    return map
  }, [almacenesDB])

  const aeropuertosCombinados = useMemo(() => {
    const map = new Map<string, CombinedWarehouse>()

    aeropuertos.forEach((a) => {
      map.set(a.codigoOACI, {
        ...a,
        continente: inferContinent(undefined, a),
      })
    })

    almacenesDB.forEach((almacen) => {
      const actual = map.get(almacen.codigoOACI)
      map.set(almacen.codigoOACI, {
        codigoOACI: almacen.codigoOACI,
        latitud: almacen.latitud,
        longitud: almacen.longitud,
        ciudad: almacen.ciudad || actual?.ciudad,
        pais: almacen.pais || actual?.pais,
        capacidadMaxima: almacen.capacidadMaxima || actual?.capacidadMaxima || 0,
        ocupacionActual: actual?.ocupacionActual || 0,
        vuelosEntrantes: actual?.vuelosEntrantes || [],
        vuelosSalientes: actual?.vuelosSalientes || [],
        vuelosCanceladosSalientes: actual?.vuelosCanceladosSalientes || [],
        editable: almacen.editable,
        continente: inferContinent(almacen, actual),
      })
    })

    return Array.from(map.values())
  }, [aeropuertos, almacenesDB])

  const term = normalizeSearch(deferredSearch)
  const searchCodeMatcher = useMemo(() => createCodePatternMatcher(deferredSearch), [deferredSearch])
  const continentOptions = useMemo(
    () => Array.from(new Set(aeropuertosCombinados.map((a) => a.continente || 'OTRO'))).sort(),
    [aeropuertosCombinados],
  )
  const hasFilters = Boolean(codePatternFilter || continentFilter !== 'todos' || occupationFilter !== 'todos')

  const filtradosPorFiltro = useMemo(() => {
    const codePatternMatcher = createCodePatternMatcher(codePatternFilter)
    return aeropuertosCombinados.filter((a) => {
      if (codePatternFilter && !codePatternMatcher(normalizeSearch(a.codigoOACI))) return false
      if (continentFilter !== 'todos' && (a.continente || 'OTRO') !== continentFilter) return false
      if (occupationFilter !== 'todos' && occupationCategory(a.ocupacionActual, a.capacidadMaxima) !== occupationFilter) return false
      return true
    })
  }, [aeropuertosCombinados, codePatternFilter, continentFilter, occupationFilter])

  const filtradosSinLimite = useMemo(() => {
    return term
      ? filtradosPorFiltro.filter((a) => {
          const codigo = normalizeSearch(a.codigoOACI)
          const ciudad = normalizeSearch(a.ciudad || getAirportCity(a.codigoOACI) || '')
          const pais = normalizeSearch(a.pais || getAirportCountry(a.codigoOACI) || '')

          if (searchScope === 'codigo') return searchCodeMatcher(codigo)
          if (searchScope === 'ciudad') return ciudad.includes(term)
          if (searchScope === 'pais') return pais.includes(term)
          return searchCodeMatcher(codigo) || ciudad.includes(term) || pais.includes(term)
        })
      : filtradosPorFiltro
  }, [filtradosPorFiltro, term, searchScope, searchCodeMatcher])

  const filtrados = showAll || term ? filtradosSinLimite : filtradosSinLimite.slice(0, DEFAULT_LIMIT)

  useEffect(() => {
    if (!onVisibleAirportsChange) return
    if (!hasFilters) {
      onVisibleAirportsChange(null)
      return
    }

    const timeoutId = window.setTimeout(() => {
      onVisibleAirportsChange(filtradosPorFiltro.map((airport) => airport.codigoOACI))
    }, 120)

    return () => window.clearTimeout(timeoutId)
  }, [filtradosPorFiltro, hasFilters, onVisibleAirportsChange])

  const enviosEnAlmacen = (codigo: string): EnvioEstado[] => {
    if (!envios) return []
    return envios.filter(e => e.aeropuertoActual === codigo)
  }

  const enviosAsociadosAeropuerto = (codigo: string): EnvioEstado[] => {
    if (!envios) return []
    return envios.filter((e) => {
      if (e.destino === codigo) return true
      const ruta = e.rutaAeropuertos || []
      const indice = ruta.indexOf(codigo)
      return indice > 0 && indice < ruta.length - 1
    })
  }

  const totalPaquetesAsociados = (codigo: string): number => {
    return enviosAsociadosAeropuerto(codigo).reduce((sum, envio) => sum + envio.cantidad, 0)
  }

  const handleSave = async (data: AlmacenDTO) => {
    if (editingAlmacen) {
      await cargaArchivosService.actualizarAlmacen(data.codigoOACI, data, contexto)
    } else {
      await cargaArchivosService.crearAlmacen(data, contexto)
    }
    const updated = await cargaArchivosService.obtenerAlmacenes(contexto)
    setAlmacenesDB(updated)
    if (onDataChanged) {
      const refreshedAeropuertos = await cargaArchivosService.obtenerAeropuertos(contexto)
      await onDataChanged(refreshedAeropuertos)
    }
  }

  const handleDelete = async (codigo: string) => {
    try {
      await cargaArchivosService.eliminarAlmacen(codigo, contexto)
      const updated = await cargaArchivosService.obtenerAlmacenes(contexto)
      setAlmacenesDB(updated)
      if (onDataChanged) {
        const refreshedAeropuertos = await cargaArchivosService.obtenerAeropuertos(contexto)
        await onDataChanged(refreshedAeropuertos)
      }
      setDeleteConfirm(null)
      setDeleteError(null)
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error || 'No se pudo eliminar el almacén')
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
    <div className="w-96 flex-1 min-h-0 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
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
        <div className="space-y-1.5">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">Búsqueda temporal</p>
            <div className="flex gap-1.5">
              <select
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                className="w-[88px] bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
              >
                <option value="todos">Todo</option>
                <option value="codigo">Código</option>
                <option value="ciudad">Ciudad</option>
                <option value="pais">País</option>
              </select>
              <input
                type="text"
                placeholder="Buscar temporalmente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-800/80">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Filtros persistentes</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setCodePatternFilter('')
                    setContinentFilter('todos')
                    setOccupationFilter('todos')
                  }}
                  className="text-[9px] text-sky-400 hover:text-sky-300"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={codePatternFilter}
                onChange={(e) => setCodePatternFilter(e.target.value)}
                placeholder="Filtro código/patrón"
                className="col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
              />
              <select
                value={continentFilter}
                onChange={(e) => setContinentFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
              >
                <option value="todos">Todos los continentes</option>
                {continentOptions.map((continent) => (
                  <option key={continent} value={continent}>{continent}</option>
                ))}
              </select>
              <select
                value={occupationFilter}
                onChange={(e) => setOccupationFilter(e.target.value as OccupationFilter)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-sky-500"
              >
                <option value="todos">Todos los semáforos</option>
                <option value="vacio">Vacío</option>
                <option value="normal">Normal</option>
                <option value="alerta">Alerta</option>
                <option value="critico">Crítico</option>
              </select>
            </div>
          </div>
        </div>
        {deleteError && (
          <div className="mt-2 rounded-lg border border-red-700 bg-red-900/40 px-3 py-2 text-xs text-red-300">
            {deleteError}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedAlmacen && (
          <div className="border-b border-gray-800 p-3">
            <AeropuertoDetailCard
              aeropuerto={selectedAlmacen}
              vuelos={vuelos}
              envios={envios}
              tzOffset={tzOffset}
              onVueloSelect={onVueloSelect}
              onClear={onSelectedAlmacenClear}
              aeropuertos={aeropuertosCombinados}
            />
          </div>
        )}
        {filtrados.length === 0 && (
          <p className="text-center text-xs text-gray-500 py-8">
            {term || hasFilters ? 'No se encontraron almacenes' : 'No hay almacenes disponibles'}
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
          const enviosAsociados = enviosAsociadosAeropuerto(a.codigoOACI)
          const paquetesAsociados = enviosAsociados.reduce((sum, envio) => sum + envio.cantidad, 0)
          const esEditable = Boolean(almacenDB?.editable)

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
                    {envios && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetalleEnviosOACI(a.codigoOACI) }}
                          className="text-[10px] text-gray-500 hover:text-amber-300 px-1 py-0.5 rounded transition-colors"
                          title="Ver envios asociados"
                        >
                          Envios ({enviosAsociados.length})
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetallePaquetesOACI(a.codigoOACI) }}
                          className="text-[10px] text-gray-500 hover:text-emerald-300 px-1 py-0.5 rounded transition-colors"
                          title="Ver paquetes unitarios asociados"
                        >
                          Paquetes ({paquetesAsociados})
                        </button>
                      </>
                    )}
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
                    {esEditable ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteError(null)
                          setDeleteConfirm(a.codigoOACI)
                        }}
                        className="text-[10px] text-gray-500 hover:text-red-400 px-1 py-0.5 rounded transition-colors"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    ) : (
                      <span
                        className="text-[10px] text-gray-600 px-1 py-0.5 rounded cursor-not-allowed"
                        title="Este almacén proviene del maestro y no se puede eliminar"
                      >
                        🗑️
                      </span>
                    )}
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
        <span>{filtrados.length} de {filtradosSinLimite.length} · base {aeropuertosCombinados.length}</span>
        {!showAll && !term && filtradosSinLimite.length > DEFAULT_LIMIT && (
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

      {detalleEnviosOACI && (
        <EnviosAeropuertoDetalle
          codigoOACI={detalleEnviosOACI}
          envios={enviosAsociadosAeropuerto(detalleEnviosOACI)}
          onClose={() => setDetalleEnviosOACI(null)}
          onEnvioSelect={onEnvioSelect}
        />
      )}

      {detallePaquetesOACI && (
        <PaquetesAeropuertoDetalle
          codigoOACI={detallePaquetesOACI}
          envios={enviosAsociadosAeropuerto(detallePaquetesOACI)}
          totalPaquetes={totalPaquetesAsociados(detallePaquetesOACI)}
          onClose={() => setDetallePaquetesOACI(null)}
          onEnvioSelect={onEnvioSelect}
        />
      )}
    </div>
  )
}

interface EnviosAeropuertoDetalleProps {
  codigoOACI: string
  envios: EnvioEstado[]
  onClose: () => void
  onEnvioSelect?: (envio: EnvioEstado) => void
}

function EnviosAeropuertoDetalle({ codigoOACI, envios, onClose, onEnvioSelect }: EnviosAeropuertoDetalleProps) {
  const ciudad = getAirportCity(codigoOACI) || codigoOACI
  const totalMaletas = envios.reduce((sum, envio) => sum + envio.cantidad, 0)
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl max-h-[80vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-100 truncate">Envios asociados a {codigoOACI}</h3>
            <p className="text-xs text-gray-400 truncate">{ciudad} - {envios.length} envio{envios.length !== 1 ? 's' : ''} - {totalMaletas} paquete{totalMaletas !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {envios.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-10">
              No hay envios con destino final o escala intermedia en este aeropuerto.
            </p>
          ) : (
            envios.map((envio) => {
              const ruta = envio.rutaAeropuertos && envio.rutaAeropuertos.length > 0
                ? envio.rutaAeropuertos
                : [envio.origen, envio.destino]
              const relacion = envio.destino === codigoOACI ? 'Destino final' : 'Destino intermedio'
              const ut = envio.vueloActual || envio.vueloEsperado || envio.ultimoVuelo

              return (
                <button
                  key={envio.id}
                  onClick={() => onEnvioSelect?.(envio)}
                  className="w-full text-left px-4 py-3 border-b border-gray-800/70 hover:bg-gray-800/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-amber-300 bg-amber-300/10 px-1.5 py-0.5 rounded">{relacion}</span>
                        <span className="text-[10px] text-gray-500 truncate">{envio.id}</span>
                      </div>
                      <div className="text-xs text-gray-200 truncate">
                        <span className="font-medium">{getAirportCity(envio.origen) || envio.origen}</span>
                        <span className="text-gray-600 mx-1">-&gt;</span>
                        <span className="font-medium">{getAirportCity(envio.destino) || envio.destino}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 truncate">
                        Ruta: {ruta.join(' -> ')}
                      </div>
                      {ut && <div className="text-[10px] text-gray-500 mt-0.5 truncate">UT: {ut}</div>}
                      <div className="text-[10px] text-gray-500 mt-0.5">{envio.cantidad} paquete{envio.cantidad !== 1 ? 's' : ''}</div>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${estadoColor[envio.estado] || 'text-gray-500'}`}>
                      {estadoLabel[envio.estado] || envio.estado}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

interface PaquetesAeropuertoDetalleProps {
  codigoOACI: string
  envios: EnvioEstado[]
  totalPaquetes: number
  onClose: () => void
  onEnvioSelect?: (envio: EnvioEstado) => void
}

function PaquetesAeropuertoDetalle({ codigoOACI, envios, totalPaquetes, onClose, onEnvioSelect }: PaquetesAeropuertoDetalleProps) {
  const ciudad = getAirportCity(codigoOACI) || codigoOACI
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
  const paquetes = envios.flatMap((envio) => {
    const ruta = envio.rutaAeropuertos && envio.rutaAeropuertos.length > 0
      ? envio.rutaAeropuertos
      : [envio.origen, envio.destino]
    const relacion = envio.destino === codigoOACI ? 'Destino final' : 'Destino intermedio'

    return Array.from({ length: envio.cantidad }, (_, index) => ({
      id: `${envio.id}-PKG-${String(index + 1).padStart(3, '0')}`,
      numero: index + 1,
      envio,
      ruta,
      relacion,
    }))
  })

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl max-h-[80vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-100 truncate">Paquetes asociados a {codigoOACI}</h3>
            <p className="text-xs text-gray-400 truncate">{ciudad} - {totalPaquetes} paquete{totalPaquetes !== 1 ? 's' : ''} unitario{totalPaquetes !== 1 ? 's' : ''} - {envios.length} envio{envios.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {paquetes.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-10">
              No hay paquetes unitarios con destino final o escala intermedia en este aeropuerto.
            </p>
          ) : (
            paquetes.map((paquete) => {
              const envio = paquete.envio
              const ut = envio.vueloActual || envio.vueloEsperado || envio.ultimoVuelo

              return (
                <button
                  key={paquete.id}
                  onClick={() => onEnvioSelect?.(envio)}
                  className="w-full text-left px-4 py-3 border-b border-gray-800/70 hover:bg-gray-800/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-300/10 px-1.5 py-0.5 rounded">{paquete.relacion}</span>
                        <span className="text-[10px] text-gray-500 truncate">{paquete.id}</span>
                      </div>
                      <div className="text-xs text-gray-200 truncate">
                        <span className="font-medium">{getAirportCity(envio.origen) || envio.origen}</span>
                        <span className="text-gray-600 mx-1">-&gt;</span>
                        <span className="font-medium">{getAirportCity(envio.destino) || envio.destino}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 truncate">
                        Envio: {envio.id} - paquete {paquete.numero} de {envio.cantidad}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                        Ruta: {paquete.ruta.join(' -> ')}
                      </div>
                      {ut && <div className="text-[10px] text-gray-500 mt-0.5 truncate">UT: {ut}</div>}
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${estadoColor[envio.estado] || 'text-gray-500'}`}>
                      {estadoLabel[envio.estado] || envio.estado}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
