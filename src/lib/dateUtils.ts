/**
 * Date utility functions for consistent timezone-safe date handling
 * Fixes off-by-one date errors caused by timezone conversions
 */

/**
 * Parse an ISO date string (YYYY-MM-DD) into a Date object at noon local time
 * This avoids timezone-related date shifts
 */
export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Create date at noon to avoid timezone boundary issues
  return new Date(year, month - 1, day, 12, 0, 0)
}

/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get YYYY-MM-DD string from a Date object in local timezone
 */
export function getLocalDateString(date: Date): string {
  return formatDateForDB(date)
}

/**
 * Check if two dates represent the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

/**
 * Get the start of day (00:00:00) for a given date in local timezone
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the end of day (23:59:59.999) for a given date in local timezone
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Add days to a date (returns a new Date object)
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Get the first day of the month for a given date
 */
export function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0)
}

/**
 * Get the last day of the month for a given date
 */
export function getLastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12, 0, 0)
}

/**
 * Compare dates for sorting (ignoring time)
 */
export function compareDates(date1: Date, date2: Date): number {
  const d1 = startOfDay(date1)
  const d2 = startOfDay(date2)
  return d1.getTime() - d2.getTime()
}