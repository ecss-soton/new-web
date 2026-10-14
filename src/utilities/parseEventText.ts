import * as chrono from 'chrono-node'
import moment from 'moment-timezone'

import { parseDiscordUrl } from '../payload/validate/eventLinks'

const TIMEZONE = 'Europe/London'

const DATE_EMOJI = ['📆', '📅', '🗓']
const TIME_EMOJI = [
  '🕖',
  '🕗',
  '🕘',
  '🕙',
  '🕚',
  '🕛',
  '🕐',
  '🕑',
  '🕒',
  '🕓',
  '🕔',
  '🕕',
  '⏰',
  '⏱',
]
const LOCATION_EMOJI = ['📌', '📍']
const TICKET_EMOJI = ['🎟', '🎫']

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((\S+?)\)/g
const ANGLE_URL_RE = /<(https?:\/\/[^>\s]+)>/gi
const BARE_URL_RE = /https?:\/\/[^\s<>()]+/gi
const RANGE_RE =
  /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-{1,2}>|→|–|—|-|to|until)\s*(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?/i
const LEADING_EMOJI_RE = /^(?::[a-z0-9_]+:\s*)+/i

interface TimeParts {
  hour: number
  minute: number
}

export interface SlateNode {
  [key: string]: unknown
  children: unknown[]
}

export interface ParsedEventFields {
  id?: string
  name?: string
  date?: string
  endTime?: string
  location?: string
  description?: SlateNode[]
  link?: string
  lumaUrl?: string
  discordUrl?: string
}

export interface ParseEventResult {
  fields: ParsedEventFields
  warnings: string[]
}

const startsWithAny = (value: string, prefixes: string[]): boolean =>
  prefixes.some(prefix => value.startsWith(prefix))

const stripEmoji = (line: string, prefixes: string[]): string | null => {
  const trimmed = line.trimStart()
  const prefix = prefixes.find(p => trimmed.startsWith(p))
  return prefix ? trimmed.slice(prefix.length).trim() : null
}

const parseTimeToken = (hourStr: string, minuteStr: string, meridiem?: string): TimeParts => {
  let hour = parseInt(hourStr, 10)
  const minute = minuteStr ? parseInt(minuteStr, 10) : 0

  if (meridiem) {
    const lower = meridiem.toLowerCase()
    if (lower === 'pm' && hour < 12) hour += 12
    if (lower === 'am' && hour === 12) hour = 0
  }

  return { hour, minute }
}

const collectUrls = (text: string): string[] => {
  const urls: string[] = []
  const push = (url: string): void => {
    if (url && !urls.includes(url)) urls.push(url)
  }

  for (const match of text.matchAll(MARKDOWN_LINK_RE)) push(match[2])
  for (const match of text.matchAll(ANGLE_URL_RE)) push(match[1])
  for (const match of text.matchAll(BARE_URL_RE)) push(match[0].replace(/[.,;:!?]+$/, ''))

  return urls
}

const paragraphFromLine = (line: string): SlateNode => {
  const children: unknown[] = []
  let lastIndex = 0
  MARKDOWN_LINK_RE.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = MARKDOWN_LINK_RE.exec(line))) {
    if (match.index > lastIndex) children.push({ text: line.slice(lastIndex, match.index) })
    children.push({
      type: 'link',
      linkType: 'custom',
      url: match[2],
      newTab: true,
      children: [{ text: match[1] }],
    })
    lastIndex = MARKDOWN_LINK_RE.lastIndex
  }

  if (lastIndex < line.length) children.push({ text: line.slice(lastIndex) })
  if (children.length === 0) children.push({ text: line })

  return { children }
}

const cleanBodyLine = (line: string): string =>
  line
    .replace(/^-#\s*/, '')
    .replace(LEADING_EMOJI_RE, '')
    .trim()

const isArtifactOnly = (line: string): boolean => {
  const stripped = line
    .replace(ANGLE_URL_RE, '')
    .replace(BARE_URL_RE, '')
    .replace(MARKDOWN_LINK_RE, '')
    .replace(/<[#@&/][^>]*>/g, '')
    .trim()
  return stripped.length === 0
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function parseEventText(text: string): ParseEventResult {
  const warnings: string[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')

  let title = ''
  let titleLine: string | null = null
  let dateLine: string | null = null
  let timeLine: string | null = null
  let locationLine: string | null = null
  let ticketLine: string | null = null

  for (const line of lines) {
    const value = line.trim()
    if (!value) continue

    const dateText = stripEmoji(value, DATE_EMOJI)
    if (dateText !== null) {
      dateLine = dateText || dateLine
      continue
    }
    const timeText = stripEmoji(value, TIME_EMOJI)
    if (timeText !== null) {
      timeLine = timeText || timeLine
      continue
    }
    const locationText = stripEmoji(value, LOCATION_EMOJI)
    if (locationText !== null) {
      locationLine = locationText || locationLine
      continue
    }
    const ticketsText = stripEmoji(value, TICKET_EMOJI)
    if (ticketsText !== null) {
      ticketLine = ticketsText || ticketLine
      continue
    }

    if (!title) {
      const candidate = value
        .replace(/^#+\s*/, '')
        .replace(LEADING_EMOJI_RE, '')
        .trim()
      if (candidate) {
        title = candidate
        titleLine = value
      }
    }
  }

  const urls = collectUrls(text)
  const fields: ParsedEventFields = {}
  const lumaUrl = urls.find(url => /^https:\/\/(?:lu\.ma|luma\.com)\//i.test(url))
  // Only treat Discord links that actually reference a scheduled event, so the
  // value always satisfies the `discordUrl` validator.
  const discordUrl = urls.find(url => parseDiscordUrl(url) !== null)
  // `link` must be validator-safe (https).
  const otherUrl = urls.find(
    url => url.startsWith('https://') && url !== lumaUrl && url !== discordUrl,
  )

  if (lumaUrl) fields.lumaUrl = lumaUrl
  if (discordUrl) fields.discordUrl = discordUrl
  if (otherUrl) fields.link = otherUrl

  if (title) {
    fields.name = title
  } else {
    warnings.push('No title found — set the event name manually.')
  }

  const reference = new Date()
  const dateSource = [dateLine, timeLine].filter(Boolean).join(' ')
  const chronoResults = dateSource ? chrono.parse(dateSource, reference, { forwardDate: true }) : []
  const dateComponents = chronoResults[0]?.start

  let year: number | undefined
  let month: number | undefined
  let day: number | undefined
  let start: TimeParts | undefined
  let end: TimeParts | undefined

  if (dateComponents) {
    year = dateComponents.get('year') ?? undefined
    month = dateComponents.get('month') ?? undefined
    day = dateComponents.get('day') ?? undefined
  }

  const rangeMatch = RANGE_RE.exec(dateSource)
  if (rangeMatch) {
    start = parseTimeToken(rangeMatch[1], rangeMatch[2], rangeMatch[3])
    end = parseTimeToken(rangeMatch[4], rangeMatch[5], rangeMatch[6])
  } else {
    const first = chronoResults[0]?.start
    if (first?.isCertain('hour')) {
      start = { hour: first.get('hour') as number, minute: first.get('minute') ?? 0 }
    }
    const second = chronoResults[1]?.start
    if (second?.isCertain('hour')) {
      end = { hour: second.get('hour') as number, minute: second.get('minute') ?? 0 }
    }
  }

  if (year && month && day) {
    const startMoment = moment.tz(
      [year, month - 1, day, start?.hour ?? 0, start?.minute ?? 0],
      TIMEZONE,
    )
    fields.date = startMoment.toISOString()

    if (end) {
      let endMoment = moment.tz([year, month - 1, day, end.hour, end.minute], TIMEZONE)
      if (!endMoment.isAfter(startMoment)) endMoment = endMoment.add(1, 'day')
      fields.endTime = endMoment.toISOString()
    } else {
      warnings.push('No end time found — set it manually if needed.')
    }

    fields.id = `${slugify(title) || 'event'}-${startMoment.format('YYYY-MM-DD')}`
  } else {
    warnings.push('Could not read the date — set it manually.')
  }

  if (locationLine) fields.location = locationLine
  else warnings.push('No location found — set it manually.')

  if (discordUrl && !fields.link && ticketLine) {
    warnings.push('Discord link detected; the sign-up link may need setting manually.')
  }

  const bodyLines = lines
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false
      if (titleLine && line === titleLine) return false
      if (startsWithAny(line, [...DATE_EMOJI, ...TIME_EMOJI, ...LOCATION_EMOJI, ...TICKET_EMOJI]))
        return false
      return true
    })
    .map(line => cleanBodyLine(line))
    .filter(line => line.length > 0 && !isArtifactOnly(line))

  if (bodyLines.length > 0) {
    fields.description = bodyLines.map(paragraphFromLine)
  }

  return { fields, warnings }
}
