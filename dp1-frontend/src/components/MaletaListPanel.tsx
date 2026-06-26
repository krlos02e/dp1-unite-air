import { useEffect, useRef, useState } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import { getAirportCity } from '../data/airportsData'
import type { MaletaEstado } from '../types'

type Tab = 'pendientes' | 'planificados' | 'envuelo' | 'entregados'

const TAB_CONFIG: { key: Tab; label: string; estados: string; horas?: number }[] = [
  { key: 'envuelo', label: 'En vuelo', estados: 'EN_VUELO' },
  { key: 'planificados', label: 'Planificadas', estados: 'EMBARCADO' },
  { key: 'pendientes', label: 'Pendientes', estados: 'EN_ESPERA' },
  { key: 'entregados', label: 'Entregadas', estados: 'ENTREGADO', horas: 4 },
]

interface Props {
  onMaletaSelect: (maleta: MaletaEstado) => void
  selectedMaletaId?: string | null
  maletasExternas?: MaletaEstado[]
  currentTime?: string | null
}

const DEFAULT_LIMIT = 50

function estaDentroDeHoras(maleta: MaletaEstado, horas?: number, currentTime?: string | null): boolean {
  if (!horas || maleta.estado !== 'ENTREGADO') return true
  if (!maleta.ultimaLlegadaUtc) return false
  const llegadaMs = Date.parse(maleta.ultimaLlegadaUtc)
  const referenciaMs = currentTime ? Date.parse(currentTime) : Date.now()
  if (Number.isNaN(llegadaMs) || Number.isNaN(referenciaMs)) return false
  const diffMs = referenciaMs - llegadaMs
  return diffMs >= 0 && diffMs <= horas * 60 * 60 * 1000
}

export default function MaletaListPanel({ onMaletaSelect, selectedMaletaId, maletasExternas, currentTime }: Props) {
  const [tab, setTab] = useState<Tab>('envuelo')
  const [search, setSearch] = useState('')
  const [maletas, setMaletas] = useState<MaletaEstado[]>([])
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const pollingRef = useRef(false)
  const mountedRef = useRef(true)

  const config = TAB_CONFIG.find((c) => c.key === tab)!

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (maletasExternas) {
      setMaletas(maletasExternas)
      setLoading(false)
      return
    }
    const fetch = async () => {
      if (pollingRef.current) return
      pollingRef.current = true
      setLoading(true)
      try {
        const horasFiltro = tab === 'entregados' && showAll ? undefined : config.horas
        const res = await cargaArchivosService.listarMaletas(config.estados, undefined, horasFiltro)
        if (mountedRef.current) setMaletas(res.maletas)
      } catch {
        // ignore
      } finally {
        if (mountedRef.current) setLoading(false)
        pollingRef.current = false
      }
    }
    fetch()
    const interval = setInterval(fetch, 15000)
    return () => clearInterval(interval)
  }, [tab, maletasExternas, showAll])

  useEffect(() => { setShowAll(false) }, [tab])

  const maletasVisibles = maletasExternas
    ? maletasExternas.filter((m) => {
        if (m.estado !== config.estados) return false
        if (tab === 'entregados' && !showAll) {
          return estaDentroDeHoras(m, config.horas, currentTime)
        }
        return true
      })
    : maletas

  const term = search.toLowerCase().trim()
  const filtradasBase = term
    ? maletasVisibles.filter((m) => (
      m.id.toLowerCase().includes(term)
      || m.envioId.toLowerCase().includes(term)
      || m.origen.toLowerCase().includes(term)
      || m.destino.toLowerCase().includes(term)
      || (getAirportCity(m.origen) || '').toLowerCase().includes(term)
      || (getAirportCity(m.destino) || '').toLowerCase().includes(term)
    ))
    : maletasVisibles
  const filtradas = showAll || term ? filtradasBase : filtradasBase.slice(0, DEFAULT_LIMIT)

  return (
    <div className="w-96 flex-1 min-h-0 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-200 mb-2">Maletas</h3>
        <input
          type="text"
          placeholder="Buscar por ID de maleta o envío..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      <div className="flex border-b border-gray-800">
        {TAB_CONFIG.map((c) => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === c.key ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-400/5' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && maletas.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtradas.length === 0 && (
          <p className="text-center text-xs text-gray-500 py-8">
            {term ? 'No se encontraron maletas' : 'No hay maletas en esta categoría'}
          </p>
        )}

        {filtradas.map((maleta) => {
          const isSelected = maleta.id === selectedMaletaId
          const ut = maleta.vueloActual || maleta.vueloEsperado
          return (
            <button
              key={maleta.id}
              onClick={() => onMaletaSelect(maleta)}
              className={`w-full text-left px-3 py-2 border-b border-gray-800/50 transition-colors hover:bg-gray-800/50 ${
                isSelected ? 'bg-sky-900/20 border-l-2 border-l-sky-500' : ''
              }`}
            >
              <div className="text-[11px] font-semibold text-amber-300 truncate">{maleta.id}</div>
              <div className="text-[10px] text-gray-500 truncate">Envío: {maleta.envioId}</div>
              <div className="text-xs text-gray-200 truncate mt-1">
                <span className="font-medium">{getAirportCity(maleta.origen) || maleta.origen}</span>
                <span className="text-gray-600 mx-1">→</span>
                <span className="font-medium">{getAirportCity(maleta.destino) || maleta.destino}</span>
              </div>
              <div className="text-[10px] text-gray-500 truncate mt-0.5">
                Subruta {maleta.subrutaIndex || 1}{ut ? ` · UT ${ut}` : ''}
              </div>
            </button>
          )
        })}
      </div>

      <div className="px-3 py-1.5 border-t border-gray-800 text-[10px] text-gray-600 flex justify-between items-center">
        <span>Mostrando {filtradas.length} de {maletasVisibles.length}</span>
        {tab === 'entregados' ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAll(false)}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors ${!showAll ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'}`}
            >
              Ultimas 4h
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors ${showAll ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'}`}
            >
              Mostrar todas
            </button>
          </div>
        ) : (
          !showAll && !term && maletasVisibles.length > DEFAULT_LIMIT && (
            <button onClick={() => setShowAll(true)} className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer">
              Mostrar todas
            </button>
          )
        )}
      </div>
    </div>
  )
}
