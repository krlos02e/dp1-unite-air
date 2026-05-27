export interface VueloDTO {
  id: string;
  origen: string;
  destino: string;
  latOrigen: number;
  lonOrigen: number;
  latDestino: number;
  lonDestino: number;
  salidaUtc: string;
  llegadaUtc: string;
  capacidad: number;
  cargaActual: number;
  progresoVuelo: number;
}

export interface AeropuertoDTO {
  codigoOACI: string;
  latitud: number;
  longitud: number;
  ciudad?: string;
  capacidadMaxima: number;
  ocupacionActual: number;
  vuelosEntrantes: string[];
  vuelosSalientes: string[];
}

export interface LogEntry {
  timestamp: string;
  tipo: 'INFO' | 'WARN' | 'ERROR' | 'COLAPSO';
  mensaje: string;
  modulo?: string;
  detalle?: string;
}

export interface SimulationState {
  sessionId: string;
  status?: string;
  simulationTime: string;
  vuelos: VueloDTO[];
  aeropuertos: AeropuertoDTO[];
  maletasEntregadas: number;
  maletasEnTransito: number;
  vuelosCulminados: number;
  vuelosEnTransito: number;
  vuelosCancelados: number;
  progreso: number;
  colapsada: boolean;
  motivoColapso: string;
  logs: LogEntry[];
}

export interface AuthResponse {
  success: boolean;
  username: string;
  role: string;
  message: string;
}

export interface CargaResult {
  success: boolean;
  message: string;
  aeropuertosCount: number;
  vuelosCount: number;
  paquetesCount: number;
}

export interface DashboardData {
  maletasEntregadasHoy: number;
  maletasEnTransito: number;
  totalVuelos: number;
  totalAeropuertos: number;
  aeropuertos: AeropuertoDTO[];
  vuelosActivos: VueloDTO[];
}
