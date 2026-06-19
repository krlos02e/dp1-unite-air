export const TIMEZONE_OPTIONS = [
  { label: 'UTC', offset: 0 },
  { label: 'UTC-5 (Peru/Colombia/Ecuador)', offset: -300 },
  { label: 'UTC-4 (Bolivia/Chile/Venezuela)', offset: -240 },
  { label: 'UTC-3 (Brasil/Argentina/Uruguay)', offset: -180 },
  { label: 'UTC+1 (Europa Central)', offset: 60 },
  { label: 'UTC+2 (Europa Oriental)', offset: 120 },
  { label: 'UTC+3 (Medio Oriente)', offset: 180 },
  { label: 'UTC+4 (Golfo)', offset: 240 },
  { label: 'UTC+5 (Pakistan)', offset: 300 },
  { label: 'UTC+5:30 (India)', offset: 330 },
]

function parseAsUtc(isoString: string): Date | null {
  if (!isoString) return null
  try {
    const str = isoString.endsWith('Z') ? isoString : isoString + 'Z'
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

export function formatTimeInTimezone(isoString: string, offsetMinutes: number): string {
  const d = parseAsUtc(isoString)
  if (!d) return '--'
  const utcMs = d.getTime()
  const targetMs = utcMs + offsetMinutes * 60000
  const target = new Date(targetMs)
  const hours = String(target.getUTCHours()).padStart(2, '0')
  const minutes = String(target.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function formatDateInTimezone(isoString: string, offsetMinutes: number): string {
  const d = parseAsUtc(isoString)
  if (!d) return '--'
  const utcMs = d.getTime()
  const targetMs = utcMs + offsetMinutes * 60000
  const target = new Date(targetMs)
  const day = String(target.getUTCDate()).padStart(2, '0')
  const month = String(target.getUTCMonth() + 1).padStart(2, '0')
  const year = target.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export function extractUtcTime(isoString: string): string {
  if (!isoString || !isoString.includes('T')) return '--:--'
  return isoString.split('T')[1].substring(0, 5)
}
