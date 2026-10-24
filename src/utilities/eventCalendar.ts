import type { Moment } from 'moment-timezone'
import moment from 'moment-timezone'

import type { Event } from '../payload/payload-types'
import { richTextToPlainText } from './richText'

export const LONDON_TIME_ZONE = 'Europe/London'

const ICS_PATH = '/api/events/ics'
const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/render'
const OUTLOOK_CALENDAR_URL = 'https://outlook.live.com/calendar/deeplink/compose'

const MAX_URL_DESCRIPTION_LENGTH = 1000
const MAX_ICS_DESCRIPTION_LENGTH = 2000

export type FeedType = 'all' | 'interested'

interface EventTiming extends Pick<Event, 'date' | 'endTime'> {}

export interface CalendarEvent
  extends Pick<Event, 'id' | 'name' | 'date' | 'endTime' | 'description' | 'location' | 'link'> {}

export interface EventTimes {
  start: Moment
  end: Moment
}

export interface FeedUrls {
  icalUrl: string
  webcalUrl: string
}

export interface EventCalendarLinks {
  google: string
  outlook: string
  ics: string
}

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '')

const feedEndpoint = (baseUrl: string): string => `${trimTrailingSlashes(baseUrl || '')}${ICS_PATH}`

/**
 * Resolves the start/end of an event in Europe/London wall-clock time.
 *
 * `event.date` is stored as the UTC instant of the start; `event.endTime` keeps
 * the UTC instant of the chosen end, but only its London hours/minutes are
 * meaningful, so they are applied to the start date (matching the collection
 * `beforeChange` hook and the existing calendar feed).
 */
export const getEventTimes = (event: EventTiming): EventTimes | null => {
  if (!event?.date) return null

  const startMillis = Date.parse(event.date)
  if (!Number.isFinite(startMillis)) return null

  const start = moment.utc(startMillis).tz(LONDON_TIME_ZONE)
  if (!start.isValid()) return null

  const endMillis = event.endTime ? Date.parse(event.endTime) : NaN
  if (!event.endTime || !Number.isFinite(endMillis)) {
    return { start, end: start.clone().add(1, 'hour') }
  }

  const endTimeInLondon = moment.utc(endMillis).tz(LONDON_TIME_ZONE)
  let end = start
    .clone()
    .hour(endTimeInLondon.hour())
    .minute(endTimeInLondon.minute())
    .second(0)
    .millisecond(0)

  // Midnight crossover: an end at or before the start belongs to the next day.
  if (end.isSameOrBefore(start)) {
    end = end.clone().add(1, 'day')
  }

  return { start, end }
}

export const getFeedUrls = ({
  baseUrl,
  feedType = 'all',
  categories = [],
  userId,
}: {
  baseUrl: string
  feedType?: FeedType
  categories?: readonly string[]
  userId?: string | null
}): FeedUrls => {
  const params = new URLSearchParams()

  if (feedType === 'interested' && userId) {
    params.set('user', userId)
  }

  const selectedCategories = categories.filter(Boolean)
  if (selectedCategories.length > 0) {
    params.set('categories', selectedCategories.join(','))
  }

  const query = params.toString()
  const endpoint = feedEndpoint(baseUrl)
  const icalUrl = query ? `${endpoint}?${query}` : endpoint
  const webcalUrl = icalUrl.replace(/^https?:\/\//, 'webcal://')

  return { icalUrl, webcalUrl }
}

export const getEventIcsUrl = (baseUrl: string, eventId: string): string =>
  `${feedEndpoint(baseUrl)}?event=${encodeURIComponent(eventId)}`

export interface EventDescriptionSource {
  description?: Event['description'] | string | null
  link?: Event['link']
}

/**
 * Plain-text description used in calendar entries. Rich text is flattened and
 * an HTTPS event link is appended so the calendar entry keeps a way to the
 * original event page.
 */
export const getEventDescription = (
  event: EventDescriptionSource,
  maxLength: number = MAX_URL_DESCRIPTION_LENGTH,
): string => {
  const text = richTextToPlainText(event.description)
  const safeLink =
    typeof event.link === 'string' && /^https:\/\//i.test(event.link.trim())
      ? event.link.trim()
      : undefined

  const sections = [text]
  if (safeLink && !text.includes(safeLink)) {
    sections.push(`More info: ${safeLink}`)
  }

  const description = sections.filter(Boolean).join('\n\n')
  if (description.length <= maxLength) return description

  return `${description.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

export const getIcsDescription = (event: EventDescriptionSource): string =>
  getEventDescription(event, MAX_ICS_DESCRIPTION_LENGTH)

const formatGoogleDate = (value: Moment): string =>
  value.clone().utc().format('YYYYMMDD[T]HHmmss[Z]')

const formatOutlookDate = (value: Moment): string =>
  value.clone().utc().format('YYYY-MM-DD[T]HH:mm:ss[Z]')

export const buildGoogleEventUrl = (event: CalendarEvent): string | null => {
  const times = getEventTimes(event)
  if (!times) return null

  const params = new URLSearchParams()
  params.set('action', 'TEMPLATE')
  params.set('text', event.name || 'ECSS event')
  params.set('dates', `${formatGoogleDate(times.start)}/${formatGoogleDate(times.end)}`)

  const details = getEventDescription(event)
  if (details) params.set('details', details)
  if (event.location) params.set('location', event.location)

  return `${GOOGLE_CALENDAR_URL}?${params.toString()}`
}

export const buildOutlookEventUrl = (event: CalendarEvent): string | null => {
  const times = getEventTimes(event)
  if (!times) return null

  const params = new URLSearchParams()
  params.set('path', '/calendar/action/compose')
  params.set('rru', 'addevent')
  params.set('startdt', formatOutlookDate(times.start))
  params.set('enddt', formatOutlookDate(times.end))
  params.set('subject', event.name || 'ECSS event')

  const details = getEventDescription(event)
  if (details) params.set('body', details)
  if (event.location) params.set('location', event.location)

  return `${OUTLOOK_CALENDAR_URL}?${params.toString()}`
}

/**
 * All per-event "add to calendar" targets, or null when the event has no
 * usable date (the button should then be hidden).
 */
export const getEventCalendarLinks = (
  event: CalendarEvent,
  baseUrl: string,
): EventCalendarLinks | null => {
  const google = buildGoogleEventUrl(event)
  const outlook = buildOutlookEventUrl(event)

  if (!google || !outlook) return null

  return {
    google,
    outlook,
    ics: getEventIcsUrl(baseUrl, event.id),
  }
}
