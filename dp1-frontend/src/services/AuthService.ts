import { HttpClient } from './HttpClient'
import type { AuthResponse } from '../types'

class AuthService extends HttpClient {
  login(username: string, password: string): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/login', { username, password })
  }

  register(username: string, password: string, email: string): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/register', { username, password, email })
  }

  status(): Promise<AuthResponse> {
    return this.get<AuthResponse>('/auth/status')
  }

  logout(): Promise<void> {
    return this.post<void>('/auth/logout')
  }
}

export const authService = new AuthService()
