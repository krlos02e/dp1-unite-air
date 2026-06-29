import type { AeropuertoDTO, VueloDTO } from '../types'
import { buildAirportLookup, getAirportCityCountryResolved } from '../data/airportsData'
import { formatTimeInTimezone, formatDateInTimezone } from '../utils/timezoneFormat'

interface Props {
  vuelo: VueloDTO
  tzOffset: number
  aeropuertos?: AeropuertoDTO[]
  onClear?: () => void
}

export default function VueloDetailCard({ vuelo, tzOffset, aeropuertos = [], onClear }: Props) {
  const airportLookup = buildAirportLookup(aeropuertos)
  const origenInfo = getAirportCityCountryResolved(vuelo.origen, airportLookup)
  const destinoInfo = getAirportCityCountryResolved(vuelo.destino, airportLookup)

  return (
    <div className="rounded-xl border border-violet-700/60 bg-violet-950/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-violet-300">Vuelo seleccionado</h4>
          <p className="text-[10px] font-mono text-violet-200">{vuelo.id}</p>
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

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-gray-400">Estado</span>
          <span className={`font-semibold ${
            vuelo.estado === 'CANCELADO'
              ? 'text-red-400'
              : vuelo.estado === 'ACTIVO'
                ? 'text-emerald-400'
                : vuelo.estado === 'PROGRAMADO'
                  ? 'text-sky-400'
                  : 'text-gray-300'
          }`}>
            {vuelo.estado || 'SIN ESTADO'}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-400">Origen</span>
          <span className="text-right font-medium text-emerald-400">{origenInfo}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-400">Salida</span>
          <span className="text-right font-medium">
            {formatDateInTimezone(vuelo.salidaUtc, tzOffset)} {formatTimeInTimezone(vuelo.salidaUtc, tzOffset)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-400">Destino</span>
          <span className="text-right font-medium text-red-400">{destinoInfo}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-400">Llegada</span>
          <span className="text-right font-medium">
            {formatDateInTimezone(vuelo.llegadaUtc, tzOffset)} {formatTimeInTimezone(vuelo.llegadaUtc, tzOffset)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-400">Maletas a bordo</span>
          <span className="font-medium text-amber-400">{vuelo.cargaActual} / {vuelo.capacidad}</span>
        </div>
        <div className="flex justify-between gap-3 pt-1">
          <span className="text-gray-400">Progreso de vuelo</span>
          <span className="font-medium text-sky-400">{Math.round(vuelo.progresoVuelo)}%</span>
        </div>
      </div>
    </div>
  )
}
