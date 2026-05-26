import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'

function customParamsSerializer(params: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
      }
    } else if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.join('&')
}

export abstract class HttpClient {
  protected readonly instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      withCredentials: true,
      paramsSerializer: customParamsSerializer,
    })

    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  protected async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const config: AxiosRequestConfig = params ? { params } : {}
    const response = await this.instance.get<T>(url, config)
    return response.data
  }

  protected async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.post<T>(url, data)
    return response.data
  }

  protected async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.put<T>(url, data)
    return response.data
  }

  protected async delete<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const config: AxiosRequestConfig = params ? { params } : {}
    const response = await this.instance.delete<T>(url, config)
    return response.data
  }
}
