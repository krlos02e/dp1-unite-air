/**
 * Formatea un string ISO de fecha (ej: 2026-06-03T06:00:00)
 * a formato legible: DD/MM/YYYY HH:mm
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '--'
  // Si ya está formateado, devolverlo
  if (isoString.includes('/')) return isoString
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch {
    return isoString
  }
}
