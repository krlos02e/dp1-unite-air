import { formatDateTime } from '../utils/dateFormat'
import { getAirportCity } from '../data/airportsData'
import type { EnvioEstado, MaletaEstado, SimulationState } from '../types'

interface Props {
  state: SimulationState | null
  isOpen: boolean
  onClose: () => void
  onNuevaSimulacion: () => void
}

function countEnvios(envios: EnvioEstado[], estado: EnvioEstado['estado']) {
  return envios.filter((envio) => envio.estado === estado).length
}

function countMaletas(maletas: MaletaEstado[], estado: MaletaEstado['estado']) {
  return maletas.filter((maleta) => maleta.estado === estado).length
}

function sameRoute(actual?: string[] | null, anterior?: string[] | null) {
  if (!actual?.length || !anterior?.length) return false
  if (actual.length !== anterior.length) return false
  return actual.every((value, index) => value === anterior[index])
}

function getRutaLabel(ruta?: string[] | null) {
  if (!ruta?.length) return 'Sin ruta'
  return ruta.map((codigo) => getAirportCity(codigo) || codigo).join(' -> ')
}

export default function ResultadosModal({ state, isOpen, onClose, onNuevaSimulacion }: Props) {
  if (!isOpen || !state) return null

  const envios = state.envios ?? []
  const maletas = state.maletas ?? []
  const vuelos = state.vuelos ?? []
  const aeropuertos = state.aeropuertos ?? []

  const enviosEntregados = countEnvios(envios, 'ENTREGADO')
  const enviosEnVuelo = countEnvios(envios, 'EN_VUELO')
  const enviosEmbarcados = countEnvios(envios, 'EMBARCADO')
  const enviosEnEspera = countEnvios(envios, 'EN_ESPERA')

  const maletasEntregadas = countMaletas(maletas, 'ENTREGADO')
  const maletasEnVuelo = countMaletas(maletas, 'EN_VUELO')
  const maletasEmbarcadas = countMaletas(maletas, 'EMBARCADO')
  const maletasEnEspera = countMaletas(maletas, 'EN_ESPERA')

  const vuelosProgramados = vuelos.filter((vuelo) => vuelo.estado === 'PROGRAMADO').length
  const vuelosActivos = vuelos.filter((vuelo) => vuelo.estado === 'ACTIVO').length
  const vuelosCulminados = vuelos.filter((vuelo) => vuelo.estado === 'CULMINADO').length
  const vuelosCancelados = vuelos.filter((vuelo) => vuelo.estado === 'CANCELADO').length

  const enviosReasignados = envios.filter((envio) =>
    envio.rutaAeropuertos?.length
    && envio.rutaAnteriorAeropuertos?.length
    && !sameRoute(envio.rutaAeropuertos, envio.rutaAnteriorAeropuertos)
  )
  const enviosConRutaNueva = envios.filter((envio) =>
    envio.rutaAeropuertos?.length
    && !envio.rutaAnteriorAeropuertos?.length
  )
  const enviosSinRuta = envios.filter((envio) => !envio.rutaAeropuertos?.length)
  const aeropuertosSaturados = aeropuertos.filter((aeropuerto) =>
    aeropuerto.capacidadMaxima > 0 && aeropuerto.ocupacionActual >= aeropuerto.capacidadMaxima
  )

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-700 bg-gray-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-emerald-400">Reporte Final de Simulacion</h2>
              <p className="mt-1 text-sm text-gray-300">
                Ultima planificacion estable mostrada en pantalla
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Corte: {formatDateTime(state.simulationTime)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-3xl leading-none text-gray-400 transition-colors hover:text-white"
              aria-label="Cerrar"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-300">Estado final</p>
              <p className="mt-2 text-2xl font-bold text-white">{state.colapsada ? 'Colapsada' : 'Completada'}</p>
              <p className="mt-1 text-sm text-emerald-200">Progreso consolidado: {state.progreso}%</p>
            </div>
            <div className="rounded-2xl border border-sky-800/60 bg-sky-950/30 p-4">
              <p className="text-xs uppercase tracking-wide text-sky-300">Envios</p>
              <p className="mt-2 text-2xl font-bold text-white">{envios.length}</p>
              <p className="mt-1 text-sm text-sky-200">Con ruta: {envios.length - enviosSinRuta.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-300">Maletas</p>
              <p className="mt-2 text-2xl font-bold text-white">{maletas.length}</p>
              <p className="mt-1 text-sm text-amber-200">Entregadas: {maletasEntregadas}</p>
            </div>
            <div className="rounded-2xl border border-fuchsia-800/60 bg-fuchsia-950/30 p-4">
              <p className="text-xs uppercase tracking-wide text-fuchsia-300">Vuelos visibles</p>
              <p className="mt-2 text-2xl font-bold text-white">{vuelos.length}</p>
              <p className="mt-1 text-sm text-fuchsia-200">Aeropuertos: {aeropuertos.length}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <h3 className="text-lg font-semibold text-gray-100">Resumen de envios</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Entregados</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">{enviosEntregados}</p>
                </div>
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">En vuelo</p>
                  <p className="mt-1 text-xl font-bold text-sky-400">{enviosEnVuelo}</p>
                </div>
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Embarcados</p>
                  <p className="mt-1 text-xl font-bold text-cyan-400">{enviosEmbarcados}</p>
                </div>
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">En espera</p>
                  <p className="mt-1 text-xl font-bold text-amber-400">{enviosEnEspera}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Nuevas asignaciones</p>
                  <p className="mt-1 text-lg font-semibold text-white">{enviosConRutaNueva.length}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Reasignados</p>
                  <p className="mt-1 text-lg font-semibold text-white">{enviosReasignados.length}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Sin ruta</p>
                  <p className="mt-1 text-lg font-semibold text-white">{enviosSinRuta.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <h3 className="text-lg font-semibold text-gray-100">Resumen de maletas</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Entregadas</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">{maletasEntregadas}</p>
                </div>
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">En vuelo</p>
                  <p className="mt-1 text-xl font-bold text-sky-400">{maletasEnVuelo}</p>
                </div>
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Embarcadas</p>
                  <p className="mt-1 text-xl font-bold text-cyan-400">{maletasEmbarcadas}</p>
                </div>
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">En espera</p>
                  <p className="mt-1 text-xl font-bold text-amber-400">{maletasEnEspera}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Maletas entregadas</p>
                  <p className="mt-1 text-lg font-semibold text-white">{state.maletasEntregadas}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Maletas en transito</p>
                  <p className="mt-1 text-lg font-semibold text-white">{state.maletasEnTransito}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Motivo de colapso</p>
                  <p className="mt-1 text-sm font-medium text-white">{state.motivoColapso || 'Sin colapso'}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <h3 className="text-lg font-semibold text-gray-100">Estado de vuelos</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Programados</p>
                  <p className="mt-1 text-xl font-bold text-gray-100">{vuelosProgramados}</p>
                </div>
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Activos</p>
                  <p className="mt-1 text-xl font-bold text-sky-400">{vuelosActivos}</p>
                </div>
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Culminados</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">{vuelosCulminados}</p>
                </div>
                <div className="rounded-xl bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Cancelados</p>
                  <p className="mt-1 text-xl font-bold text-rose-400">{vuelosCancelados}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Vuelos en transito</p>
                  <p className="mt-1 text-lg font-semibold text-white">{state.vuelosEnTransito}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Vuelos culminados</p>
                  <p className="mt-1 text-lg font-semibold text-white">{state.vuelosCulminados}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Vuelos cancelados</p>
                  <p className="mt-1 text-lg font-semibold text-white">{state.vuelosCancelados}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <h3 className="text-lg font-semibold text-gray-100">Estado de aeropuertos</h3>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Aeropuertos visibles</p>
                  <p className="mt-1 text-lg font-semibold text-white">{aeropuertos.length}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Saturados</p>
                  <p className="mt-1 text-lg font-semibold text-white">{aeropuertosSaturados.length}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-400">Con cancelaciones salientes</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {aeropuertos.filter((aeropuerto) => aeropuerto.vuelosCanceladosSalientes.length > 0).length}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-300">Aeropuertos mas cargados</p>
                <div className="mt-3 space-y-2">
                  {aeropuertos
                    .slice()
                    .sort((a, b) => b.ocupacionActual - a.ocupacionActual)
                    .slice(0, 5)
                    .map((aeropuerto) => (
                      <div key={aeropuerto.codigoOACI} className="rounded-xl bg-gray-950/60 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {getAirportCity(aeropuerto.codigoOACI) || aeropuerto.codigoOACI}
                            </p>
                            <p className="text-xs text-gray-500">{aeropuerto.codigoOACI}</p>
                          </div>
                          <p className="text-sm text-gray-300">
                            {aeropuerto.ocupacionActual} / {aeropuerto.capacidadMaxima}
                          </p>
                        </div>
                      </div>
                    ))}
                  {aeropuertos.length === 0 && (
                    <p className="text-sm text-gray-500">No hay aeropuertos disponibles en el reporte.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <h3 className="text-lg font-semibold text-gray-100">Envios reasignados</h3>
              <div className="mt-3 space-y-3">
                {enviosReasignados.slice(0, 8).map((envio) => (
                  <div key={envio.id} className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                    <p className="text-sm font-semibold text-white">{envio.id}</p>
                    <p className="mt-1 text-xs text-gray-400">{envio.origen} {'->'} {envio.destino}</p>
                    <p className="mt-2 text-xs text-gray-500">Ruta anterior</p>
                    <p className="text-sm text-gray-300">{getRutaLabel(envio.rutaAnteriorAeropuertos)}</p>
                    <p className="mt-2 text-xs text-gray-500">Ruta estable final</p>
                    <p className="text-sm text-gray-100">{getRutaLabel(envio.rutaAeropuertos)}</p>
                  </div>
                ))}
                {enviosReasignados.length === 0 && (
                  <p className="text-sm text-gray-500">No hubo envios reasignados en la ultima planificacion estable.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <h3 className="text-lg font-semibold text-gray-100">Envios sin ruta o pendientes</h3>
              <div className="mt-3 space-y-3">
                {[...enviosSinRuta, ...envios.filter((envio) => envio.estado === 'EN_ESPERA' && envio.rutaAeropuertos?.length)]
                  .slice(0, 8)
                  .map((envio) => (
                    <div key={envio.id} className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{envio.id}</p>
                          <p className="mt-1 text-xs text-gray-400">{envio.origen} {'->'} {envio.destino}</p>
                        </div>
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
                          {envio.estado}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-300">{getRutaLabel(envio.rutaAeropuertos)}</p>
                    </div>
                  ))}
                {enviosSinRuta.length === 0 && enviosEnEspera === 0 && (
                  <p className="text-sm text-gray-500">No hay envios pendientes ni sin ruta en el corte final estable.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-gray-800 bg-gray-950/95 px-6 py-4 backdrop-blur">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-700 py-3 font-medium transition-colors hover:bg-gray-600"
            >
              Cerrar
            </button>
            <button
              onClick={onNuevaSimulacion}
              className="flex-1 rounded-xl bg-emerald-600 py-3 font-medium transition-colors hover:bg-emerald-700"
            >
              Nueva Simulación
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
