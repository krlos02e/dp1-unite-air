import type { LogEntry } from '../types'

interface Props {
  log: LogEntry | null
  isOpen: boolean
  onClose: () => void
}

function tipoIcono(tipo: string): string {
  switch (tipo) {
    case 'ERROR': return '✕'
    case 'WARN': return '⚠'
    case 'COLAPSO': return '!!'
    default: return 'i'
  }
}

function tipoColor(tipo: string): string {
  switch (tipo) {
    case 'ERROR': return 'text-red-400 bg-red-500/10 border-red-500/30'
    case 'WARN': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    case 'COLAPSO': return 'text-red-500 bg-red-500/10 border-red-500/30'
    default: return 'text-sky-400 bg-sky-500/10 border-sky-500/30'
  }
}

export default function LogModal({ log, isOpen, onClose }: Props) {
  if (!isOpen || !log) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-xl mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border ${tipoColor(log.tipo)}`}>
            {tipoIcono(log.tipo)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Registro Operativo</h2>
            <p className="text-xs text-gray-500">{log.modulo || 'Sistema'} · {log.timestamp}</p>
          </div>
          <span className={`ml-auto px-2.5 py-1 rounded text-xs font-bold border ${tipoColor(log.tipo)}`}>
            {log.tipo}
          </span>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-200 font-mono leading-relaxed">{log.mensaje}</p>
        </div>

        {log.detalle && (
          <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
            <p className="text-gray-500 text-xs mb-1">Detalle</p>
            <p className="text-sm text-gray-300 font-mono">{log.detalle}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-2">
            <span className="block text-gray-600">Timestamp</span>
            <span className="font-mono text-gray-300">{log.timestamp}</span>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <span className="block text-gray-600">Módulo</span>
            <span className="font-mono text-gray-300">{log.modulo || 'N/A'}</span>
          </div>
        </div>

        <button onClick={onClose}
                className="w-full bg-gray-700 hover:bg-gray-600 py-2.5 rounded-lg font-medium text-sm transition-colors">
          Cerrar
        </button>
      </div>
    </div>
  )
}
