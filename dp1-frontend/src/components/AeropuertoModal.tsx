import { useState, useMemo } from 'react'
import type { AeropuertoDTO, EnvioEstado, VueloDTO } from '../types'
import { AIRPORTS_DATA, getAirportCityCountry } from '../data/airportsData'
import { formatTimeInTimezone, formatDateInTimezone } from '../utils/timezoneFormat'

interface Props {
  aeropuerto: AeropuertoDTO | null
  isOpen: boolean
  onClose: () => void
  vuelos?: VueloDTO[]
  envios?: EnvioEstado[]
  tzOffset: number
  onVueloSelect?: (vuelo: VueloDTO) => void
  onEnvioSelect?: (envio: EnvioEstado) => void
}

export default function AeropuertoModal({ aeropuerto, isOpen, onClose, vuelos = [], envios = [], tzOffset, onVueloSelect }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSection, setExpandedSection] = useState<'entrantes' | 'salientes' | 'cancelados' | null>(null)
  const [expandedIncomingFlightId, setExpandedIncomingFlightId] = useState<string | null>(null)
  const [expandedEnvioId, setExpandedEnvioId] = useState<string | null>(null)
  const [filtroEntrantes, setFiltroEntrantes] = useState<'id' | 'ciudad'>('ciudad')
  const [filtroSalientes, setFiltroSalientes] = useState<'id' | 'ciudad'>('ciudad')
  const [filtroCancelados, setFiltroCancelados] = useState<'id' | 'ciudad'>('ciudad')

  const staticData = aeropuerto ? AIRPORTS_DATA[aeropuerto.codigoOACI] : null
  const pais = staticData?.pais || ''

  const vuelosMap = useMemo(() => {
    const map = new Map<string, VueloDTO>()
    vuelos.forEach(v => map.set(v.id, v))
    return map
  }, [vuelos])

  const enviosByFlight = useMemo(() => {
    const map = new Map<string, EnvioEstado[]>()
    envios.forEach((envio) => {
      const flightIds = [envio.vueloActual, envio.vueloEsperado, envio.ultimoVuelo].filter(Boolean) as string[]
      flightIds.forEach((flightId) => {
        const list = map.get(flightId) || []
        list.push(envio)
        map.set(flightId, list)
      })
    })
    return map
  }, [envios])

  const filteredEntrantes = useMemo(() => {
    if (!aeropuerto) return []
    return aeropuerto.vuelosEntrantes.filter(id => {
      const vuelo = vuelosMap.get(id)
      if (!vuelo || vuelo.progresoVuelo <= 0 || vuelo.progresoVuelo >= 100) return false
      if (!searchTerm) return true
      if (filtroEntrantes === 'id') {
        return id.toLowerCase().includes(searchTerm.toLowerCase())
      } else {
        const ciudadOrigen = getAirportCityCountry(vuelo.origen)
        return ciudadOrigen.toLowerCase().includes(searchTerm.toLowerCase())
      }
    })
  }, [aeropuerto, searchTerm, vuelosMap, filtroEntrantes])

  const filteredSalientes = useMemo(() => {
    if (!aeropuerto) return []
    return aeropuerto.vuelosSalientes.filter(id => {
      const vuelo = vuelosMap.get(id)
      if (!vuelo || vuelo.progresoVuelo <= 0 || vuelo.progresoVuelo >= 100) return false
      if (!searchTerm) return true
      if (filtroSalientes === 'id') {
        return id.toLowerCase().includes(searchTerm.toLowerCase())
      } else {
        const ciudadDestino = getAirportCityCountry(vuelo.destino)
        return ciudadDestino.toLowerCase().includes(searchTerm.toLowerCase())
      }
    })
  }, [aeropuerto, searchTerm, vuelosMap, filtroSalientes])

  const filteredCancelados = useMemo(() => {
    if (!aeropuerto) return []
    return (aeropuerto.vuelosCanceladosSalientes || []).filter(id => {
      const vuelo = vuelosMap.get(id)
      if (!searchTerm) return true
      if (!vuelo) return id.toLowerCase().includes(searchTerm.toLowerCase())
      if (filtroCancelados === 'id') {
        return id.toLowerCase().includes(searchTerm.toLowerCase())
      } else {
        const ciudadDestino = getAirportCityCountry(vuelo.destino)
        return ciudadDestino.toLowerCase().includes(searchTerm.toLowerCase())
      }
    })
  }, [aeropuerto, searchTerm, vuelosMap, filtroCancelados])

  const countEntrantesTransito = useMemo(() => {
    if (!aeropuerto) return 0
    return aeropuerto.vuelosEntrantes.filter(id => {
      const vuelo = vuelosMap.get(id)
      return vuelo && vuelo.progresoVuelo > 0 && vuelo.progresoVuelo < 100
    }).length
  }, [aeropuerto, vuelosMap])

  const countSalientesTransito = useMemo(() => {
    if (!aeropuerto) return 0
    return aeropuerto.vuelosSalientes.filter(id => {
      const vuelo = vuelosMap.get(id)
      return vuelo && vuelo.progresoVuelo > 0 && vuelo.progresoVuelo < 100
    }).length
  }, [aeropuerto, vuelosMap])

  if (!isOpen || !aeropuerto) return null

  const toggleSection = (section: 'entrantes' | 'salientes' | 'cancelados') => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  return (
    <div className="absolute bottom-4 right-4 z-[1001] w-[22rem] max-w-[calc(100%-2rem)] sm:w-[24rem]">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-3 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-bold text-emerald-400">{aeropuerto.codigoOACI}</h2>
            <p className="text-[10px] text-gray-400">
              {staticData?.ciudad || aeropuerto.ciudad || ''}{pais ? `, ${pais}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <div className="space-y-1 text-xs mb-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Maletas en almacén</span>
            <span className="font-medium text-amber-400">{aeropuerto.ocupacionActual} / {aeropuerto.capacidadMaxima}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Vuelos entrantes</span>
            <span className="font-medium text-sky-400">{countEntrantesTransito}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Vuelos salientes</span>
            <span className="font-medium text-sky-400">{countSalientesTransito}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Vuelos cancelados</span>
            <span className="font-medium text-red-400">{(aeropuerto.vuelosCanceladosSalientes || []).length}</span>
          </div>
        </div>

        <div className="mb-2">
          <input
            type="text"
            placeholder={
              expandedSection === 'entrantes' 
                ? (filtroEntrantes === 'id' ? 'Buscar por ID de vuelo...' : 'Buscar por ciudad de origen...')
                : expandedSection === 'salientes'
                ? (filtroSalientes === 'id' ? 'Buscar por ID de vuelo...' : 'Buscar por ciudad de destino...')
                : expandedSection === 'cancelados'
                ? (filtroCancelados === 'id' ? 'Buscar por ID de vuelo...' : 'Buscar por ciudad de destino...')
                : 'Expandir una sección para buscar...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1 max-h-[28rem] overflow-y-auto">
          <div className="border border-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('entrantes')}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800 rounded-t-lg"
            >
              <span>Vuelos entrantes ({filteredEntrantes.length})</span>
              <span className="text-xs">{expandedSection === 'entrantes' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'entrantes' && (
              <div className="px-3 pb-2 space-y-1">
                <div className="flex gap-2 mb-2">
                  <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="radio"
                      name="filtro-entrantes"
                      value="ciudad"
                      checked={filtroEntrantes === 'ciudad'}
                      onChange={() => setFiltroEntrantes('ciudad')}
                      className="w-3 h-3"
                    />
                    Ciudad origen
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="radio"
                      name="filtro-entrantes"
                      value="id"
                      checked={filtroEntrantes === 'id'}
                      onChange={() => setFiltroEntrantes('id')}
                      className="w-3 h-3"
                    />
                    ID vuelo
                  </label>
                </div>
                {filteredEntrantes.length === 0 ? (
                  <p className="text-xs text-gray-500">Ninguno</p>
                ) : (
                  filteredEntrantes.map(id => {
                    const vuelo = vuelosMap.get(id)
                    const enviosEntrantes = enviosByFlight.get(id) || []
                    const isFlightExpanded = expandedIncomingFlightId === id
                    return (
                      <div key={id} className="border-t border-gray-800">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedIncomingFlightId(isFlightExpanded ? null : id)
                            setExpandedEnvioId(null)
                          }}
                          disabled={!vuelo}
                          className="w-full text-left text-xs text-gray-400 px-1 py-1 rounded hover:bg-amber-900/20 hover:border-amber-700/50 transition-colors disabled:cursor-default"
                          title="Ver envios entrantes"
                        >
                          <div className="flex justify-between gap-2">
                            <span className="font-medium text-gray-300">{id}</span>
                            <span className="text-sky-400 truncate">Desde: {vuelo ? getAirportCityCountry(vuelo.origen) : '?'}</span>
                          </div>
                          {vuelo && (
                            <div className="text-gray-500">
                              Llegada: {formatDateInTimezone(vuelo.llegadaUtc, tzOffset)} {formatTimeInTimezone(vuelo.llegadaUtc, tzOffset)}
                            </div>
                          )}
                          <div className="text-[10px] text-gray-500">
                            {enviosEntrantes.length} envio{enviosEntrantes.length !== 1 ? 's' : ''} entrante{enviosEntrantes.length !== 1 ? 's' : ''}
                          </div>
                        </button>

                        {isFlightExpanded && (
                          <div className="ml-2 mb-1 border-l border-gray-700 pl-2 space-y-1">
                            {enviosEntrantes.length === 0 ? (
                              <p className="text-[10px] text-gray-500 py-1">No hay envios asociados a este vuelo</p>
                            ) : (
                              enviosEntrantes.map((envio) => {
                                const isEnvioExpanded = expandedEnvioId === envio.id
                                return (
                                  <div key={envio.id} className="rounded border border-gray-800 bg-gray-900/60">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedEnvioId(isEnvioExpanded ? null : envio.id)}
                                      className="w-full text-left px-2 py-1 hover:bg-gray-800/70 transition-colors"
                                      title="Ver maletas individuales"
                                    >
                                      <div className="flex justify-between gap-2">
                                        <span className="text-[10px] font-medium text-gray-300 truncate">{envio.id}</span>
                                        <span className="text-[10px] text-amber-400 whitespace-nowrap">{envio.cantidad} maleta{envio.cantidad !== 1 ? 's' : ''}</span>
                                      </div>
                                      <div className="text-[10px] text-gray-500 truncate">
                                        {getAirportCityCountry(envio.origen)} -&gt; {getAirportCityCountry(envio.destino)}
                                      </div>
                                    </button>

                                    {isEnvioExpanded && (
                                      <div className="px-2 pb-1 space-y-0.5">
                                        {Array.from({ length: envio.cantidad }, (_, index) => (
                                          <div key={`${envio.id}-maleta-${index + 1}`} className="flex justify-between text-[10px] text-gray-400 border-t border-gray-800 py-0.5">
                                            <span>Maleta {index + 1}</span>
                                            <span className="font-mono text-gray-500">{envio.id}-BAG-{String(index + 1).padStart(3, '0')}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          <div className="border border-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('salientes')}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800 rounded-t-lg"
            >
              <span>Vuelos salientes ({filteredSalientes.length})</span>
              <span className="text-xs">{expandedSection === 'salientes' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'salientes' && (
              <div className="px-3 pb-2 space-y-1">
                <div className="flex gap-2 mb-2">
                  <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="radio"
                      name="filtro-salientes"
                      value="ciudad"
                      checked={filtroSalientes === 'ciudad'}
                      onChange={() => setFiltroSalientes('ciudad')}
                      className="w-3 h-3"
                    />
                    Ciudad destino
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="radio"
                      name="filtro-salientes"
                      value="id"
                      checked={filtroSalientes === 'id'}
                      onChange={() => setFiltroSalientes('id')}
                      className="w-3 h-3"
                    />
                    ID vuelo
                  </label>
                </div>
                {filteredSalientes.length === 0 ? (
                  <p className="text-xs text-gray-500">Ninguno</p>
                ) : (
                  filteredSalientes.map(id => {
                    const vuelo = vuelosMap.get(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => vuelo && onVueloSelect?.(vuelo)}
                        disabled={!vuelo}
                        className="w-full text-left text-xs text-gray-400 border-t border-gray-800 px-1 py-1 rounded hover:bg-amber-900/20 hover:border-amber-700/50 transition-colors disabled:cursor-default"
                        title="Seleccionar vuelo en el mapa"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-300">{id}</span>
                          <span className="text-emerald-400">Hacia: {vuelo ? getAirportCityCountry(vuelo.destino) : '?'}</span>
                        </div>
                        {vuelo && (
                          <div className="text-gray-500">
                            Salida: {formatDateInTimezone(vuelo.salidaUtc, tzOffset)} {formatTimeInTimezone(vuelo.salidaUtc, tzOffset)}
                          </div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          <div className="border border-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('cancelados')}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800 rounded-t-lg"
            >
              <span>Vuelos cancelados ({filteredCancelados.length})</span>
              <span className="text-xs">{expandedSection === 'cancelados' ? '▼' : '▶'}</span>
            </button>
            {expandedSection === 'cancelados' && (
              <div className="px-3 pb-2 space-y-1">
                <div className="flex gap-2 mb-2">
                  <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="radio"
                      name="filtro-cancelados"
                      value="ciudad"
                      checked={filtroCancelados === 'ciudad'}
                      onChange={() => setFiltroCancelados('ciudad')}
                      className="w-3 h-3"
                    />
                    Ciudad destino
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="radio"
                      name="filtro-cancelados"
                      value="id"
                      checked={filtroCancelados === 'id'}
                      onChange={() => setFiltroCancelados('id')}
                      className="w-3 h-3"
                    />
                    ID vuelo
                  </label>
                </div>
                {filteredCancelados.length === 0 ? (
                  <p className="text-xs text-gray-500">Ninguno</p>
                ) : (
                  filteredCancelados.map(id => {
                    const vuelo = vuelosMap.get(id)
                    return (
                      <div key={id} className="text-xs text-gray-400 border-t border-gray-800 pt-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-300">{id}</span>
                          <span className="text-red-400">Hacia: {vuelo ? getAirportCityCountry(vuelo.destino) : '?'}</span>
                        </div>
                        {vuelo && (
                          <div className="text-gray-500">
                            Salida programada: {formatDateInTimezone(vuelo.salidaUtc, tzOffset)} {formatTimeInTimezone(vuelo.salidaUtc, tzOffset)}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
