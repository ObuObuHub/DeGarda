/**
 * Date utility functions for shift generation
 */

export function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr)
}

export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const checkDate = parseDate(date)
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  return checkDate >= start && checkDate <= end
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function isSameDate(date1: string, date2: string): boolean {
  return date1 === date2
}