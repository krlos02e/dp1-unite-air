import { HttpClient } from './HttpClient'
import type { CargaResult } from '../types'

class CargaArchivosService extends HttpClient {
  upload(
    files: { planes_vuelo?: File; aeropuertos?: File; envios?: File },
    onProgress?: (pct: number) => void
  ): Promise<CargaResult> {
    const formData = new FormData()
    if (files.planes_vuelo) formData.append('planes_vuelo', files.planes_vuelo)
    if (files.aeropuertos) formData.append('aeropuertos', files.aeropuertos)
    if (files.envios) formData.append('envios', files.envios)

    return this.instance.post('/carga/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    }).then((r) => r.data as CargaResult)
  }
}

export const cargaArchivosService = new CargaArchivosService()
