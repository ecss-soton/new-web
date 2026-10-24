import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildGoogleEventUrl,
  buildOutlookEventUrl,
  getEventCalendarLinks,
  getEventDescription,
  getEventIcsUrl,
  getEventTimes,
  getFeedUrls,
  getIcsDescription,
} from './eventCalendar'

const BASE_URL = 'https://ecss.example.com'

const event = {
  id: '64b7f0f0f0f0f0f0f0f0f0f0',
  name: 'ECSS & Friends: Café Night',
  date: '2026-10-05T18:00:00.000Z',
  endTime: '2026-10-05T20:30:00.000Z',
  location: 'Building 32, Room 1012',
  description: [
    {
      type: 'p',
      children: [{ text: 'An evening of games and snacks.' }],
    },
  ],
  link: 'https://ecss.example.com/events/cafe-night',
}

test('event times use the London wall clock for the end time', () => {
  const times = getEventTimes(event)
  assert.ok(times)
  assert.equal(times.start.format('HH:mm'), '19:00')
  assert.equal(times.end.format('HH:mm'), '21:30')
  assert.equal(times.start.clone().utc().format(), '2026-10-05T18:00:00Z')
  assert.equal(times.end.clone().utc().format(), '2026-10-05T20:30:00Z')
})

test('event times fall back to one hour when there is no end time', () => {
  const times = getEventTimes({ date: event.date, endTime: null })
  assert.ok(times)
  assert.equal(times.end.clone().utc().format(), '2026-10-05T19:00:00Z')
})

test('event times roll an end time past midnight onto the next day', () => {
  const times = getEventTimes({
    date: '2026-10-05T22:00:00.000Z', // 23:00 in London (BST)
    endTime: '2026-10-05T23:30:00.000Z', // 00:30 in London (BST)
  })
  assert.ok(times)
  assert.equal(times.start.format('HH:mm'), '23:00')
  assert.equal(times.end.format('YYYY-MM-DD HH:mm'), '2026-10-06 00:30')
  assert.equal(times.end.clone().utc().format(), '2026-10-05T23:30:00Z')
})

test('event times respect the GMT/BST offset either side of the spring change', () => {
  const beforeChange = getEventTimes({
    date: '2026-03-28T20:00:00.000Z', // GMT: 20:00 London
    endTime: '2026-03-28T22:00:00.000Z', // GMT: 22:00 London
  })
  const afterChange = getEventTimes({
    date: '2026-03-29T20:00:00.000Z', // BST: 21:00 London
    endTime: '2026-03-29T22:00:00.000Z', // BST: 23:00 London
  })

  assert.ok(beforeChange)
  assert.ok(afterChange)
  assert.equal(beforeChange.start.clone().utc().format('HH:mm'), '20:00')
  assert.equal(afterChange.start.format('HH:mm'), '21:00')
  assert.equal(afterChange.start.clone().utc().format('HH:mm'), '20:00')
})

test('event times return null for an invalid date', () => {
  assert.equal(getEventTimes({ date: '' }), null)
  assert.equal(getEventTimes({ date: 'not-a-date' }), null)
})

test('google links carry the event details and UTC range', () => {
  const url = buildGoogleEventUrl(event)
  assert.ok(url)

  const parsed = new URL(url)
  assert.equal(parsed.origin + parsed.pathname, 'https://calendar.google.com/calendar/render')
  assert.equal(parsed.searchParams.get('action'), 'TEMPLATE')
  assert.equal(parsed.searchParams.get('text'), event.name)
  assert.equal(parsed.searchParams.get('dates'), '20261005T180000Z/20261005T203000Z')
  assert.equal(parsed.searchParams.get('location'), event.location)
  assert.match(parsed.searchParams.get('details') || '', /An evening of games and snacks\./)
  assert.match(parsed.searchParams.get('details') || '', /More info: https:\/\/ecss\.example\.com/)
})

test('google links omit an empty location', () => {
  const url = buildGoogleEventUrl({ ...event, location: null })
  assert.ok(url)
  assert.equal(new URL(url).searchParams.has('location'), false)
})

test('outlook links carry the event details and UTC range', () => {
  const url = buildOutlookEventUrl(event)
  assert.ok(url)

  const parsed = new URL(url)
  assert.equal(
    parsed.origin + parsed.pathname,
    'https://outlook.live.com/calendar/deeplink/compose',
  )
  assert.equal(parsed.searchParams.get('rru'), 'addevent')
  assert.equal(parsed.searchParams.get('path'), '/calendar/action/compose')
  assert.equal(parsed.searchParams.get('startdt'), '2026-10-05T18:00:00Z')
  assert.equal(parsed.searchParams.get('enddt'), '2026-10-05T20:30:00Z')
  assert.equal(parsed.searchParams.get('subject'), event.name)
})

test('event link builders return null for an invalid date', () => {
  assert.equal(buildGoogleEventUrl({ ...event, date: '' }), null)
  assert.equal(buildOutlookEventUrl({ ...event, date: '' }), null)
})

test('per-event links include the single-event ICS download URL', () => {
  const links = getEventCalendarLinks(event, `${BASE_URL}/`)
  assert.ok(links)
  assert.equal(links.ics, `${BASE_URL}/api/events/ics?event=${event.id}`)
  assert.match(links.google, /^https:\/\/calendar\.google\.com\//)
  assert.match(links.outlook, /^https:\/\/outlook\.live\.com\//)
  assert.equal(getEventCalendarLinks({ ...event, date: '' }, BASE_URL), null)
})

test('feed URLs default to every event', () => {
  const { icalUrl, webcalUrl } = getFeedUrls({ baseUrl: BASE_URL })
  assert.equal(icalUrl, `${BASE_URL}/api/events/ics`)
  assert.equal(webcalUrl, 'webcal://ecss.example.com/api/events/ics')
})

test('feed URLs scope to a user and categories', () => {
  const { icalUrl } = getFeedUrls({
    baseUrl: `${BASE_URL}/`,
    feedType: 'interested',
    userId: event.id,
    categories: ['academic', 'social'],
  })

  const parsed = new URL(icalUrl)
  assert.equal(parsed.pathname, '/api/events/ics')
  assert.equal(parsed.searchParams.get('user'), event.id)
  assert.equal(parsed.searchParams.get('categories'), 'academic,social')
})

test('feed URLs ignore an interested feed without a user id', () => {
  const { icalUrl } = getFeedUrls({ baseUrl: BASE_URL, feedType: 'interested' })
  assert.equal(icalUrl, `${BASE_URL}/api/events/ics`)
})

test('feed URLs work with an empty base URL', () => {
  const { icalUrl } = getFeedUrls({ baseUrl: '' })
  assert.equal(icalUrl, '/api/events/ics')
})

test('single event URLs encode the event id', () => {
  assert.equal(getEventIcsUrl(BASE_URL, 'a b/c'), `${BASE_URL}/api/events/ics?event=a%20b%2Fc`)
})

test('plain text descriptions drop links that are not HTTPS', () => {
  assert.equal(getEventDescription({ description: 'Hello', link: 'javascript:alert(1)' }), 'Hello')
  assert.equal(getEventDescription({ description: 'Hello', link: 'http://example.com' }), 'Hello')
})

test('long descriptions are truncated for ICS and URL usage', () => {
  const description = 'x'.repeat(3000)
  assert.ok(getIcsDescription({ description }).length <= 2000)
  assert.ok(getEventDescription({ description }).length <= 1000)
  assert.ok(getEventDescription({ description }).endsWith('...'))
})
