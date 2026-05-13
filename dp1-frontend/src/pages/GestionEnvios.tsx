import { useState } from 'react'
import { cargaArchivosService } from '../services/CargaArchivosService'
import type { CargaResult } from '../types'

export default function GestionEnvios() {
  const [planesVuelo, setPlanesVuelo] = useState<File | null>(null)
  const [aeropuertos, setAeropuertos] = useState<File | null>(null)
  const [envios, setEnvios] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<CargaResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async () => {
    setError(null)
    setResult(null)
    setProgress(0)
    setUploading(true)

    try {
      const res = await cargaArchivosService.upload(
        {
          planes_vuelo: planesVuelo ?? undefined,
          aeropuertos: aeropuertos ?? undefined,
          envios: envios ?? undefined,
        },
        (pct) => setProgress(pct)
      )
      setResult(res)
    } catch {
      setError('Error al subir los archivos. Verifique el formato.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-6">Gestión de Envíos</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <FileInput label="Archivo de vuelos (planes_vuelo.txt)" onChange={setPlanesVuelo} />
        <FileInput label="Archivo de aeropuertos (aeropuertos.txt)" onChange={setAeropuertos} />
        <FileInput label="Archivo de envíos (envíos.txt)" onChange={setEnvios} />

        <button
          onClick={handleUpload}
          disabled={uploading || (!planesVuelo && !aeropuertos && !envios)}
          className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2.5 rounded-lg font-semibold"
        >
          {uploading ? 'Subiendo...' : 'Subir Archivos'}
        </button>

        {uploading && (
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div className="bg-sky-500 h-4 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-300 p-4 rounded-lg space-y-1">
            <p className="font-semibold">{result.message}</p>
            <p>Aeropuertos: {result.aeropuertosCount}</p>
            <p>Vuelos: {result.vuelosCount}</p>
            <p>Paquetes: {result.paquetesCount}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function FileInput({ label, onChange }: { label: string; onChange: (f: File | null) => void }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type="file"
        accept=".txt"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 cursor-pointer"
      />
    </div>
  )
}
