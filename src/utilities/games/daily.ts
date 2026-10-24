/**
 * Shared helpers for dated (daily) games.
 *
 * Days are UK calendar days (Europe/London), so puzzles roll over at local
 * midnight and follow British Summer Time. All date maths is done on plain
 * "YYYY-MM-DD" day keys, never on timestamps, so DST days (23/25 hours) cannot
 * skip or repeat a puzzle.
 */

const LONDON_TIME_ZONE = 'Europe/London'
const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const londonDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const pad = (value: number, length = 2): string => String(value).padStart(length, '0')

const formatDayKey = (year: number, month: number, day: number): string =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}`

/** The Europe/London calendar day for an instant, e.g. "2026-07-16". */
export const getDayKey = (now: Date = new Date()): string => {
  const parts = londonDateFormatter.formatToParts(now)
  const valueFor = (type: string): string => parts.find(part => part.type === type)?.value ?? ''

  return `${valueFor('year')}-${valueFor('month')}-${valueFor('day')}`
}

/** Days since 1970-01-01 for a calendar date. Pure calendar maths, no timezones. */
export const getDayNumber = (dayKey: string): number => {
  const match = DAY_KEY_PATTERN.exec(dayKey)
  if (!match) return Number.NaN

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  // Howard Hinnant's civil-from-days inverse (days_from_civil).
  const adjustedYear = month <= 2 ? year - 1 : year
  const era = Math.floor(adjustedYear / 400)
  const yearOfEra = adjustedYear - era * 400
  const monthIndex = month + (month > 2 ? -3 : 9)
  const dayOfYear = Math.floor((153 * monthIndex + 2) / 5) + day - 1
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear

  return era * 146097 + dayOfEra - 719468
}

const dayKeyFromNumber = (dayNumber: number): string => {
  const shifted = dayNumber + 719468
  const era = Math.floor(shifted / 146097)
  const dayOfEra = shifted - era * 146097
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  )
  const year = yearOfEra + era * 400
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100))
  const monthIndex = Math.floor((5 * dayOfYear + 2) / 153)
  const day = dayOfYear - Math.floor((153 * monthIndex + 2) / 5) + 1
  const month = monthIndex + (monthIndex < 10 ? 3 : -9)

  return formatDayKey(year + (month <= 2 ? 1 : 0), month, day)
}

export const addDays = (dayKey: string, amount: number): string =>
  dayKeyFromNumber(getDayNumber(dayKey) + amount)

export const daysBetween = (from: string, to: string): number =>
  getDayNumber(to) - getDayNumber(from)

export const isNextDay = (previous: string, next: string): boolean =>
  daysBetween(previous, next) === 1

/** Normalise a stored date: a day key is returned as-is, a timestamp becomes its London day. */
export const toDayKey = (value: string): string => {
  if (DAY_KEY_PATTERN.test(value)) return value

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : getDayKey(parsed)
}

const PUZZLE_EPOCH_DAY = getDayNumber('2026-01-01')

/** Puzzle number for a day key, with 2026-01-01 as puzzle #1. */
export const getPuzzleNumberForDay = (dayKey: string): number =>
  getDayNumber(dayKey) - PUZZLE_EPOCH_DAY + 1

export const getPuzzleNumber = (now: Date = new Date()): number =>
  getPuzzleNumberForDay(getDayKey(now))

/** FNV-1a: small, deterministic string hash used to seed daily puzzles. */
export const hashString = (value: string): number => {
  let hash = 2166136261

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

/** mulberry32: returns a deterministic pseudo-random generator in [0, 1). */
export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
