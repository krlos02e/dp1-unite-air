import { HttpClient } from './HttpClient'
import type { CargaResult, AeropuertoDTO, VueloDTO, CancelarVueloResult, EnvioEntrada, AgregarEnviosResult, EnviosIncrementalesResponse, EnvioBusquedaResponse } from '../types'

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

  obtenerAeropuertos(): Promise<AeropuertoDTO[]> {
    return this.get<AeropuertoDTO[]>('/carga/aeropuertos')
  }

  obtenerVuelos(): Promise<VueloDTO[]> {
    return this.get<VueloDTO[]>('/carga/vuelos')
  }

  cancelarVuelo(origen: string, destino: string, horaSalidaLocal: string): Promise<CancelarVueloResult> {
    return this.instance.post('/vuelos/cancelar', { origen, destino, horaSalidaLocal })
      .then((r) => r.data as CancelarVueloResult)
  }

  obtenerVuelosCancelados(): Promise<string[]> {
    return this.get<string[]>('/vuelos/cancelados')
  }

  agregarEnvios(envios: EnvioEntrada[]): Promise<AgregarEnviosResult> {
    return this.instance.post('/envios', { envios })
      .then((r) => r.data as AgregarEnviosResult)
  }

  obtenerEnviosIncrementales(): Promise<EnviosIncrementalesResponse> {
    return this.get<EnviosIncrementalesResponse>('/envios/incrementales')
  }

  buscarEnvios(query: string): Promise<EnvioBusquedaResponse> {
    return this.get<EnvioBusquedaResponse>(`/envios/buscar?q=${encodeURIComponent(query)}`)
  }

  listarEnvios(estados?: string, origen?: string, horas?: number): Promise<EnvioBusquedaResponse> {
    const params = new URLSearchParams()
    if (estados) params.set('estados', estados)
    if (origen) params.set('origen', origen)
    if (horas !== undefined) params.set('horas', String(horas))
    const qs = params.toString()
    return this.get<EnvioBusquedaResponse>(`/envios/lista${qs ? '?' + qs : ''}`)
  }
}

export const cargaArchivosService = new CargaArchivosService()
