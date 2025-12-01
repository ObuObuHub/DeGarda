import {
  parseISODate,
  formatDateForDB,
  addDays,
  getFirstDayOfMonth,
  getLastDayOfMonth,
} from '../dateUtils'

describe('dateUtils', () => {
  describe('parseISODate', () => {
    it('parses ISO date string correctly', () => {
      const date = parseISODate('2024-08-15')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(7) // August is month 7
      expect(date.getDate()).toBe(15)
    })

    it('creates date at noon to avoid timezone issues', () => {
      const date = parseISODate('2024-01-01')
      expect(date.getHours()).toBe(12)
    })

    it('handles first day of year', () => {
      const date = parseISODate('2024-01-01')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0)
      expect(date.getDate()).toBe(1)
    })

    it('handles last day of year', () => {
      const date = parseISODate('2024-12-31')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(11)
      expect(date.getDate()).toBe(31)
    })
  })

  describe('formatDateForDB', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2024, 7, 15, 12, 0, 0) // August 15, 2024
      expect(formatDateForDB(date)).toBe('2024-08-15')
    })

    it('pads single-digit months with zero', () => {
      const date = new Date(2024, 0, 15) // January
      expect(formatDateForDB(date)).toBe('2024-01-15')
    })

    it('pads single-digit days with zero', () => {
      const date = new Date(2024, 7, 5)
      expect(formatDateForDB(date)).toBe('2024-08-05')
    })

    it('roundtrips with parseISODate', () => {
      const original = '2024-08-15'
      const parsed = parseISODate(original)
      const formatted = formatDateForDB(parsed)
      expect(formatted).toBe(original)
    })
  })

  describe('addDays', () => {
    it('adds days correctly', () => {
      const date = new Date(2024, 7, 15)
      const result = addDays(date, 5)
      expect(result.getDate()).toBe(20)
    })

    it('handles month boundary', () => {
      const date = new Date(2024, 7, 30) // August 30
      const result = addDays(date, 5)
      expect(result.getMonth()).toBe(8) // September
      expect(result.getDate()).toBe(4)
    })

    it('handles year boundary', () => {
      const date = new Date(2024, 11, 30) // December 30
      const result = addDays(date, 5)
      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(0) // January
    })

    it('subtracts days with negative number', () => {
      const date = new Date(2024, 7, 15)
      const result = addDays(date, -5)
      expect(result.getDate()).toBe(10)
    })

    it('does not mutate original date', () => {
      const date = new Date(2024, 7, 15)
      const originalDate = date.getDate()
      addDays(date, 5)
      expect(date.getDate()).toBe(originalDate)
    })
  })

  describe('getFirstDayOfMonth', () => {
    it('returns first day of month', () => {
      const date = new Date(2024, 7, 15)
      const result = getFirstDayOfMonth(date)
      expect(result.getDate()).toBe(1)
      expect(result.getMonth()).toBe(7)
    })

    it('preserves year and month', () => {
      const date = new Date(2024, 11, 25) // December 25
      const result = getFirstDayOfMonth(date)
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(11)
      expect(result.getDate()).toBe(1)
    })
  })

  describe('getLastDayOfMonth', () => {
    it('returns last day of month with 31 days', () => {
      const date = new Date(2024, 7, 15) // August
      const result = getLastDayOfMonth(date)
      expect(result.getDate()).toBe(31)
    })

    it('returns last day of month with 30 days', () => {
      const date = new Date(2024, 8, 15) // September
      const result = getLastDayOfMonth(date)
      expect(result.getDate()).toBe(30)
    })

    it('handles February in leap year', () => {
      const date = new Date(2024, 1, 15) // February 2024 (leap year)
      const result = getLastDayOfMonth(date)
      expect(result.getDate()).toBe(29)
    })

    it('handles February in non-leap year', () => {
      const date = new Date(2023, 1, 15) // February 2023
      const result = getLastDayOfMonth(date)
      expect(result.getDate()).toBe(28)
    })
  })
})
