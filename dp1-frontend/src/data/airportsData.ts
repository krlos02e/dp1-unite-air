export interface AirportStaticData {
  codigoOACI: string;
  ciudad: string;
  pais: string;
  capacidad: number;
  latitud: number;
  longitud: number;
  gmtOffset: string;
}

export const AIRPORTS_DATA: Record<string, AirportStaticData> = {
  SKBO: { codigoOACI: 'SKBO', ciudad: 'Bogota', pais: 'Colombia', capacidad: 430, latitud: 4.701389, longitud: -74.146944, gmtOffset: 'UTC-5' },
  SEQM: { codigoOACI: 'SEQM', ciudad: 'Quito', pais: 'Ecuador', capacidad: 410, latitud: 0.113333, longitud: -78.358611, gmtOffset: 'UTC-5' },
  SVMI: { codigoOACI: 'SVMI', ciudad: 'Caracas', pais: 'Venezuela', capacidad: 400, latitud: 10.603056, longitud: -66.990556, gmtOffset: 'UTC-4' },
  SBBR: { codigoOACI: 'SBBR', ciudad: 'Brasilia', pais: 'Brasil', capacidad: 480, latitud: -15.864722, longitud: -47.918056, gmtOffset: 'UTC-3' },
  SPIM: { codigoOACI: 'SPIM', ciudad: 'Lima', pais: 'Perú', capacidad: 440, latitud: -12.021944, longitud: -77.114444, gmtOffset: 'UTC-5' },
  SLLP: { codigoOACI: 'SLLP', ciudad: 'La Paz', pais: 'Bolivia', capacidad: 420, latitud: -16.513056, longitud: -68.192222, gmtOffset: 'UTC-4' },
  SCEL: { codigoOACI: 'SCEL', ciudad: 'Santiago de Chile', pais: 'Chile', capacidad: 460, latitud: -33.396389, longitud: -70.794722, gmtOffset: 'UTC-4' },
  SABE: { codigoOACI: 'SABE', ciudad: 'Buenos Aires', pais: 'Argentina', capacidad: 460, latitud: -34.559167, longitud: -58.415556, gmtOffset: 'UTC-3' },
  SGAS: { codigoOACI: 'SGAS', ciudad: 'Asunción', pais: 'Paraguay', capacidad: 400, latitud: -25.24, longitud: -57.52, gmtOffset: 'UTC-4' },
  SUAA: { codigoOACI: 'SUAA', ciudad: 'Motenvideo', pais: 'Uruguay', capacidad: 400, latitud: -34.789167, longitud: -56.264722, gmtOffset: 'UTC-3' },
  LATI: { codigoOACI: 'LATI', ciudad: 'Tirana', pais: 'Albania', capacidad: 410, latitud: 41.414722, longitud: 19.720556, gmtOffset: 'UTC+1' },
  EDDI: { codigoOACI: 'EDDI', ciudad: 'Berlin', pais: 'Alemania', capacidad: 480, latitud: 52.473611, longitud: 13.401667, gmtOffset: 'UTC+1' },
  LOWW: { codigoOACI: 'LOWW', ciudad: 'Viena', pais: 'Austria', capacidad: 430, latitud: 48.110833, longitud: 16.570833, gmtOffset: 'UTC+1' },
  EBCI: { codigoOACI: 'EBCI', ciudad: 'Bruselas', pais: 'Belgica', capacidad: 440, latitud: 50.459167, longitud: 4.453611, gmtOffset: 'UTC+1' },
  UMMS: { codigoOACI: 'UMMS', ciudad: 'Minsk', pais: 'Bielorrusia', capacidad: 400, latitud: 53.8825, longitud: 28.0325, gmtOffset: 'UTC+3' },
  LBSF: { codigoOACI: 'LBSF', ciudad: 'Sofia', pais: 'Bulgaria', capacidad: 400, latitud: 42.690278, longitud: 23.404722, gmtOffset: 'UTC+2' },
  LKPR: { codigoOACI: 'LKPR', ciudad: 'Praga', pais: 'Checa', capacidad: 400, latitud: 50.101389, longitud: 14.265556, gmtOffset: 'UTC+1' },
  LDZA: { codigoOACI: 'LDZA', ciudad: 'Zagreb', pais: 'Croacia', capacidad: 420, latitud: 45.742778, longitud: 16.068611, gmtOffset: 'UTC+1' },
  EKCH: { codigoOACI: 'EKCH', ciudad: 'Copenhague', pais: 'Dinamarca', capacidad: 480, latitud: 55.618056, longitud: 12.656111, gmtOffset: 'UTC+1' },
  EHAM: { codigoOACI: 'EHAM', ciudad: 'Amsterdam', pais: 'Holanda', capacidad: 480, latitud: 52.3, longitud: 4.765, gmtOffset: 'UTC+1' },
  VIDP: { codigoOACI: 'VIDP', ciudad: 'Delhi', pais: 'India', capacidad: 480, latitud: 28.566389, longitud: 77.103056, gmtOffset: 'UTC+5:30' },
  OSDI: { codigoOACI: 'OSDI', ciudad: 'Damasco', pais: 'Siria', capacidad: 400, latitud: 33.411389, longitud: 36.515556, gmtOffset: 'UTC+3' },
  OERK: { codigoOACI: 'OERK', ciudad: 'Riad', pais: 'Arabia Saudita', capacidad: 420, latitud: 24.957778, longitud: 46.698889, gmtOffset: 'UTC+3' },
  OAKB: { codigoOACI: 'OAKB', ciudad: 'Kabul', pais: 'Afganistan', capacidad: 480, latitud: 34.565556, longitud: 69.210833, gmtOffset: 'UTC+4:30' },
  OOMS: { codigoOACI: 'OOMS', ciudad: 'Mascate', pais: 'Oman', capacidad: 460, latitud: 23.589444, longitud: 58.284167, gmtOffset: 'UTC+4' },
  OYSN: { codigoOACI: 'OYSN', ciudad: 'Sana', pais: 'Yemen', capacidad: 420, latitud: 15.476111, longitud: 44.219722, gmtOffset: 'UTC+3' },
  UBBB: { codigoOACI: 'UBBB', ciudad: 'Baku', pais: 'Azerbaiyan', capacidad: 400, latitud: 40.467222, longitud: 50.046667, gmtOffset: 'UTC+4' },
  OJAI: { codigoOACI: 'OJAI', ciudad: 'Aman', pais: 'Jordania', capacidad: 400, latitud: 31.7225, longitud: 35.993333, gmtOffset: 'UTC+3' },
  OMDB: { codigoOACI: 'OMDB', ciudad: 'Dubai', pais: 'Emiratos Arabes Unidos', capacidad: 480, latitud: 25.2532, longitud: 55.3657, gmtOffset: 'UTC+4' },
  OPKC: { codigoOACI: 'OPKC', ciudad: 'Karachi', pais: 'Pakistan', capacidad: 400, latitud: 24.9, longitud: 67.15, gmtOffset: 'UTC+5' },
};

export function getAirportCity(oaci: string): string | undefined {
  return AIRPORTS_DATA[oaci]?.ciudad;
}

export function getAirportTimezone(oaci: string): string | undefined {
  return AIRPORTS_DATA[oaci]?.gmtOffset;
}

export function enrichAirport(a: { codigoOACI: string; latitud?: number; longitud?: number; ciudad?: string; capacidadMaxima?: number }) {
  const staticData = AIRPORTS_DATA[a.codigoOACI];
  if (!staticData) return a;
  return {
    ...a,
    ciudad: a.ciudad || staticData.ciudad,
    latitud: a.latitud || staticData.latitud,
    longitud: a.longitud || staticData.longitud,
    capacidadMaxima: a.capacidadMaxima || staticData.capacidad,
  };
}
