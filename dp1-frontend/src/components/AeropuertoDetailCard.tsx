import { useMemo, useState } from 'react'
import type { AeropuertoDTO, EnvioEstado, VueloDTO } from '../types'
import { buildAirportLookup, getAirportCityCountryResolved } from '../data/airportsData'
import { formatTimeInTimezone, formatDateInTimezone } from '../utils/timezoneFormat'

interface Props {
  aeropuerto: AeropuertoDTO
  vuelos?: VueloDTO[]
  envios?: EnvioEstado[]
  tzOffset: number
  aeropuertos?: AeropuertoDTO[]
  onVueloSelect?: (vuelo: VueloDTO) => void
  onClear?: () => void
}

export default function AeropuertoDetailCard({
  aeropuerto,
  vuelos = [],
  envios = [],
  tzOffset,
  onVueloSelect,
  onClear,
  aeropuertos = [],
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSection, setExpandedSection] = useState<'entrantes' | 'salientes' | 'cancelados' | null>(null)
  const [expandedIncomingFlightId, setExpandedIncomingFlightId] = useState<string | null>(null)
  const [expandedEnvioId, setExpandedEnvioId] = useState<string | null>(null)
  const [filtroEntrantes, setFiltroEntrantes] = useState<'id' | 'ciudad'>('ciudad')
  const [filtroSalientes, setFiltroSalientes] = useState<'id' | 'ciudad'>('ciudad')
  const [filtroCancelados, setFiltroCancelados] = useState<'id' | 'ciudad'>('ciudad')

  const airportLookup = useMemo(() => buildAirportLookup(aeropuertos), [aeropuertos])
  const pais = aeropuerto?.pais || ''

  const vuelosMap = useMemo(() => {
    const map = new Map<string, VueloDTO>()
    vuelos.forEach((v) => map.set(v.id, v))
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
    return aeropuerto.vuelosEntrantes.filter((id) => {
      const vuelo = vuelosMap.get(id)
      if (!vuelo || vuelo.progresoVuelo <= 0 || vuelo.progresoVuelo >= 100) return false
      if (!searchTerm) return true
      if (filtroEntrantes === 'id') return id.toLowerCase().includes(searchTerm.toLowerCase())
      return getAirportCityCountryResolved(vuelo.origen, airportLookup).toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [aeropuerto, searchTerm, vuelosMap, filtroEntrantes, airportLookup])

  const filteredSalientes = useMemo(() => {
    return aeropuerto.vuelosSalientes.filter((id) => {
      const vuelo = vuelosMap.get(id)
      if (!vuelo || vuelo.progresoVuelo <= 0 || vuelo.progresoVuelo >= 100) return false
      if (!searchTerm) return true
      if (filtroSalientes === 'id') return id.toLowerCase().includes(searchTerm.toLowerCase())
      return getAirportCityCountryResolved(vuelo.destino, airportLookup).toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [aeropuerto, searchTerm, vuelosMap, filtroSalientes, airportLookup])

  const filteredCancelados = useMemo(() => {
    return (aeropuerto.vuelosCanceladosSalientes || []).filter((id) => {
      const vuelo = vuelosMap.get(id)
      if (!searchTerm) return true
      if (!vuelo) return id.toLowerCase().includes(searchTerm.toLowerCase())
      if (filtroCancelados === 'id') return id.toLowerCase().includes(searchTerm.toLowerCase())
      return getAirportCityCountryResolved(vuelo.destino, airportLookup).toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [aeropuerto, searchTerm, vuelosMap, filtroCancelados, airportLookup])

  const countEntrantesTransito = useMemo(
    () => aeropuerto.vuelosEntrantes.filter((id) => {
      const vuelo = vuelosMap.get(id)
      return vuelo && vuelo.progresoVuelo > 0 && vuelo.progresoVuelo < 100
    }).length,
    [aeropuerto, vuelosMap],
  )

  const countSalientesTransito = useMemo(
    () => aeropuerto.vuelosSalientes.filter((id) => {
      const vuelo = vuelosMap.get(id)
      return vuelo && vuelo.progresoVuelo > 0 && vuelo.progresoVuelo < 100
    }).length,
    [aeropuerto, vuelosMap],
  )

  const toggleSection = (section: 'entrantes' | 'salientes' | 'cancelados') => {
    setExpandedSection((prev) => prev === section ? null : section)
  }

  return (
    <div className="rounded-xl border border-violet-700/60 bg-violet-950/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-violet-300">Almacén seleccionado</h4>
          <p className="text-xs font-semibold text-emerald-400">{aeropuerto.codigoOACI}</p>
          <p className="text-[10px] text-gray-400">{aeropuerto.ciudad || ''}{pais ? `, ${pais}` : ''}</p>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-violet-700/60 px-2 py-1 text-[10px] text-violet-200 hover:bg-violet-900/40"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="mb-2 space-y-1 text-xs">
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
          className="w-full rounded-lg border border-gray-700 bg-gray-900/70 px-2 py-1 text-xs text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
        />
      </div>

      <div className="max-h-[22rem] space-y-1 overflow-y-auto">
        <div className="rounded-lg border border-gray-700">
          <button
            onClick={() => toggleSection('entrantes')}
            className="flex w-full items-center justify-between rounded-t-lg px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800"
          >
            <span>Vuelos entrantes ({filteredEntrantes.length})</span>
            <span>{expandedSection === 'entrantes' ? '▼' : '▶'}</span>
          </button>
          {expandedSection === 'entrantes' && (
            <div className="space-y-1 px-3 pb-2">
              <div className="mb-2 flex gap-2">
                <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-400">
                  <input type="radio" name="filtro-entrantes-panel" checked={filtroEntrantes === 'ciudad'} onChange={() => setFiltroEntrantes('ciudad')} className="h-3 w-3" />
                  Ciudad origen
                </label>
                <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-400">
                  <input type="radio" name="filtro-entrantes-panel" checked={filtroEntrantes === 'id'} onChange={() => setFiltroEntrantes('id')} className="h-3 w-3" />
                  ID vuelo
                </label>
              </div>
              {filteredEntrantes.length === 0 ? (
                <p className="text-xs text-gray-500">Ninguno</p>
              ) : filteredEntrantes.map((id) => {
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
                      className="w-full rounded px-1 py-1 text-left text-xs text-gray-400 transition-colors hover:bg-violet-900/20 disabled:cursor-default"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-gray-300">{id}</span>
                        <span className="truncate text-sky-400">Desde: {vuelo ? getAirportCityCountryResolved(vuelo.origen, airportLookup) : '?'}</span>
                      </div>
                      {vuelo && (
                        <div className="text-gray-500">
                          Llegada: {formatDateInTimezone(vuelo.llegadaUtc, tzOffset)} {formatTimeInTimezone(vuelo.llegadaUtc, tzOffset)}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-500">
                        {enviosEntrantes.length} envío{enviosEntrantes.length !== 1 ? 's' : ''} entrante{enviosEntrantes.length !== 1 ? 's' : ''}
                      </div>
                    </button>
                    {isFlightExpanded && (
                      <div className="mb-1 ml-2 space-y-1 border-l border-gray-700 pl-2">
                        {enviosEntrantes.length === 0 ? (
                          <p className="py-1 text-[10px] text-gray-500">No hay envíos asociados a este vuelo</p>
                        ) : enviosEntrantes.map((envio) => {
                          const isEnvioExpanded = expandedEnvioId === envio.id
                          return (
                            <div key={envio.id} className="rounded border border-gray-800 bg-gray-900/60">
                              <button
                                type="button"
                                onClick={() => setExpandedEnvioId(isEnvioExpanded ? null : envio.id)}
                                className="w-full px-2 py-1 text-left transition-colors hover:bg-gray-800/70"
                              >
                                <div className="flex justify-between gap-2">
                                  <span className="truncate text-[10px] font-medium text-gray-300">{envio.id}</span>
                                  <span className="whitespace-nowrap text-[10px] text-amber-400">{envio.cantidad} maleta{envio.cantidad !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="truncate text-[10px] text-gray-500">
                                  {getAirportCityCountryResolved(envio.origen, airportLookup)} -&gt; {getAirportCityCountryResolved(envio.destino, airportLookup)}
                                </div>
                              </button>
                              {isEnvioExpanded && (
                                <div className="space-y-0.5 px-2 pb-1">
                                  {Array.from({ length: envio.cantidad }, (_, index) => (
                                    <div key={`${envio.id}-maleta-${index + 1}`} className="flex justify-between border-t border-gray-800 py-0.5 text-[10px] text-gray-400">
                                      <span>Maleta {index + 1}</span>
                                      <span className="font-mono text-gray-500">{envio.id}-BAG-{String(index + 1).padStart(3, '0')}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-700">
          <button onClick={() => toggleSection('salientes')} className="flex w-full items-center justify-between rounded-t-lg px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800">
            <span>Vuelos salientes ({filteredSalientes.length})</span>
            <span>{expandedSection === 'salientes' ? '▼' : '▶'}</span>
          </button>
          {expandedSection === 'salientes' && (
            <div className="space-y-1 px-3 pb-2">
              <div className="mb-2 flex gap-2">
                <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-400">
                  <input type="radio" name="filtro-salientes-panel" checked={filtroSalientes === 'ciudad'} onChange={() => setFiltroSalientes('ciudad')} className="h-3 w-3" />
                  Ciudad destino
                </label>
                <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-400">
                  <input type="radio" name="filtro-salientes-panel" checked={filtroSalientes === 'id'} onChange={() => setFiltroSalientes('id')} className="h-3 w-3" />
                  ID vuelo
                </label>
              </div>
              {filteredSalientes.length === 0 ? (
                <p className="text-xs text-gray-500">Ninguno</p>
              ) : filteredSalientes.map((id) => {
                const vuelo = vuelosMap.get(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => vuelo && onVueloSelect?.(vuelo)}
                    disabled={!vuelo}
                    className="w-full rounded border-t border-gray-800 px-1 py-1 text-left text-xs text-gray-400 transition-colors hover:bg-violet-900/20 disabled:cursor-default"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-gray-300">{id}</span>
                      <span className="text-emerald-400">Hacia: {vuelo ? getAirportCityCountryResolved(vuelo.destino, airportLookup) : '?'}</span>
                    </div>
                    {vuelo && (
                      <div className="text-gray-500">
                        Salida: {formatDateInTimezone(vuelo.salidaUtc, tzOffset)} {formatTimeInTimezone(vuelo.salidaUtc, tzOffset)}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-700">
          <button onClick={() => toggleSection('cancelados')} className="flex w-full items-center justify-between rounded-t-lg px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800">
            <span>Vuelos cancelados ({filteredCancelados.length})</span>
            <span>{expandedSection === 'cancelados' ? '▼' : '▶'}</span>
          </button>
          {expandedSection === 'cancelados' && (
            <div className="space-y-1 px-3 pb-2">
              <div className="mb-2 flex gap-2">
                <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-400">
                  <input type="radio" name="filtro-cancelados-panel" checked={filtroCancelados === 'ciudad'} onChange={() => setFiltroCancelados('ciudad')} className="h-3 w-3" />
                  Ciudad destino
                </label>
                <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-400">
                  <input type="radio" name="filtro-cancelados-panel" checked={filtroCancelados === 'id'} onChange={() => setFiltroCancelados('id')} className="h-3 w-3" />
                  ID vuelo
                </label>
              </div>
              {filteredCancelados.length === 0 ? (
                <p className="text-xs text-gray-500">Ninguno</p>
              ) : filteredCancelados.map((id) => {
                const vuelo = vuelosMap.get(id)
                return (
                  <div key={id} className="border-t border-gray-800 pt-1 text-xs text-gray-400">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-gray-300">{id}</span>
                      <span className="text-red-400">Hacia: {vuelo ? getAirportCityCountryResolved(vuelo.destino, airportLookup) : '?'}</span>
                    </div>
                    {vuelo && (
                      <div className="text-gray-500">
                        Salida programada: {formatDateInTimezone(vuelo.salidaUtc, tzOffset)} {formatTimeInTimezone(vuelo.salidaUtc, tzOffset)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
