import { memo } from 'react'
import type { LogEntry } from '../types'

interface Props {
  logs: LogEntry[]
}

const LogPanel = memo(function LogPanel({ logs }: Props) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-10">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div>
          <h3 className="font-bold text-gray-800">Detalles de la simulacion:</h3>
          <p className="text-sm text-green-600 font-medium">Estado: En simulacion</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 text-sm border-b border-gray-100 pb-2 last:border-0">
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
              log.tipo === 'ERROR' || log.tipo === 'COLAPSO' ? 'bg-red-500' :
              log.tipo === 'WARN' ? 'bg-amber-500' : 'bg-green-500'
            }`} />
            <div>
              <span className="text-gray-400 text-xs">{log.timestamp}</span>
              <p className="text-gray-700 text-sm">{log.mensaje}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export default LogPanel
