import ical from 'ical-generator'
import type { CollectionConfig, Validate, Where } from 'payload/types'

import { getEventTimes, getIcsDescription, LONDON_TIME_ZONE } from '../../utilities/eventCalendar'
import { EVENT_CATEGORIES, isEventCategory } from '../../utilities/eventCategories'
import { admins } from '../access/admins'
import { adminsOrPublished } from '../access/adminsOrPublished'
import { isAdmin } from '../access/isAdmin'
import type { Event } from '../payload-types'
import { withEndpointErrorHandler } from '../utilities/endpointHandler'
import { isDiscordUrl, isLumaUrl, parseDiscordUrl } from '../validate/eventLinks'
import { isHTTPS } from '../validate/isHTTPS'
import { isSafeLink } from '../validate/isSafeLink'
import { ParseEventFromPaste } from './Events/react/ParseEventFromPaste'

const validateCoordinate =
  (minimum: number, maximum: number, label: string): Validate =>
  value => {
    if (value === undefined || value === null) return true
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < minimum ||
      value > maximum
    ) {
      return `${label} must be between ${minimum} and ${maximum}`
    }
    return true
  }

const buildCalendar = (events: Event[]): string => {
  const calendar = ical({
    name: 'ECSS Events',
    timezone: LONDON_TIME_ZONE,
  })

  events.forEach(event => {
    const times = getEventTimes(event)
    if (!times) return

    calendar.createEvent({
      id: event.id,
      // Pass the London wall-clock moments directly
      start: times.start,
      end: times.end,
      timezone: LONDON_TIME_ZONE,
      summary: event.name,
      description: getIcsDescription(event),
      location: event.location || '',
      url: event.link || '',
    })
  })

  return calendar.toString()
}

const getEventFilename = (name?: string | null): string => {
  const slug = (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')

  return `${slug || 'event'}.ics`
}

const Events: CollectionConfig = {
  slug: 'events',
  access: {
    read: adminsOrPublished,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'date', 'category', 'isJumpstart', 'sortOrder'],
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        // If both date and endTime exist, stitch them together before saving
        if (data.date && data.endTime) {
          const startDate = new Date(data.date)
          const rawEndDate = new Date(data.endTime)

          const actualEndDate = new Date(data.date)
          actualEndDate.setHours(rawEndDate.getHours(), rawEndDate.getMinutes(), 0, 0)

          // Handle midnight crossover
          if (actualEndDate <= startDate) {
            actualEndDate.setDate(actualEndDate.getDate() + 1)
          }

          // Override the garbage Payload date with the mathematically correct date
          data.endTime = actualEndDate.toISOString()
        }

        // Keep the Discord metadata in sync with the pasted link.
        if (data.discordUrl !== undefined) {
          const ids = parseDiscordUrl(data.discordUrl)
          data.discordGuildId = ids?.guildId ?? null
          data.discordEventId = ids?.eventId ?? null
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'parseFromPaste',
      type: 'ui',
      admin: {
        components: {
          Field: ParseEventFromPaste,
        },
        condition: data => !data?.id,
      },
    },
    {
      name: 'id',
      label: 'id',
      type: 'text',
      required: true,
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd-MM-yyyy HH:mm',
        },
      },
    },
    {
      name: 'endTime',
      label: 'End Time',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd-MM-yyyy HH:mm',
        },
      },
    },
    {
      name: 'location',
      label: 'Location',
      type: 'text',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'richText',
    },
    {
      name: 'link',
      label: 'Any associated links',
      type: 'text',
      validate: isSafeLink,
    },
    {
      name: 'image',
      label: 'Image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'isJumpstart',
      label: 'Is this a Jumpstart Event?',
      type: 'checkbox',
    },
    {
      name: 'category',
      label: 'Event Category',
      type: 'select',
      options: [...EVENT_CATEGORIES],
      admin: {
        description:
          'Category used to group events and to filter calendar subscriptions. Leave blank if the event does not fit a category.',
      },
    },
    {
      name: 'sortOrder',
      label: 'Sort Order',
      type: 'number',
      defaultValue: 0,
      admin: {
        condition: (_, siblingData) => siblingData?.isJumpstart,
        description: 'Order within the day. Lower numbers appear first.',
      },
    },
    {
      name: 'mapsUrl',
      label: 'Google Maps URL',
      type: 'text',
      validate: isHTTPS,
      admin: {
        condition: (_, siblingData) => siblingData?.isJumpstart,
        description: 'URL for "Get me there" button (e.g. Google Maps link).',
      },
    },
    {
      name: 'latitude',
      label: 'Latitude',
      type: 'number',
      validate: validateCoordinate(-90, 90, 'Latitude'),
      admin: {
        condition: (_, siblingData) => siblingData?.isJumpstart,
        description: 'Latitude for map pin (e.g. 50.9350).',
        step: 0.0001,
      },
    },
    {
      name: 'longitude',
      label: 'Longitude',
      type: 'number',
      validate: validateCoordinate(-180, 180, 'Longitude'),
      admin: {
        condition: (_, siblingData) => siblingData?.isJumpstart,
        description: 'Longitude for map pin (e.g. -1.3964).',
        step: 0.0001,
      },
    },
    {
      name: 'interestedCount',
      label: 'Number of interested people',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'interestedUsers',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: {
        readOnly: true,
      },
      access: {
        read: admins,
        update: () => false,
      },
    },
    {
      type: 'collapsible',
      label: 'External links & Discord',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'lumaUrl',
          label: 'Luma link',
          type: 'text',
          validate: isLumaUrl,
          admin: {
            description: 'Optional lu.ma / luma.com event link.',
          },
        },
        {
          name: 'discordUrl',
          label: 'Discord event link',
          type: 'text',
          validate: isDiscordUrl,
          admin: {
            description:
              'Optional Discord scheduled event link (discord.com/events/… or discord.gg/…?event=…).',
          },
        },
        {
          name: 'discordGuildId',
          type: 'text',
          access: {
            read: admins,
          },
          admin: {
            readOnly: true,
            hidden: true,
          },
        },
        {
          name: 'discordEventId',
          type: 'text',
          access: {
            read: admins,
          },
          admin: {
            readOnly: true,
            hidden: true,
          },
        },
        {
          name: 'discordInterestedCount',
          label: 'Discord interested count',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Number of people interested on Discord, synced automatically.',
          },
        },
        {
          name: 'discordLastSyncedAt',
          label: 'Discord last synced',
          type: 'date',
          access: {
            read: admins,
          },
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'discordSyncError',
          label: 'Discord sync error',
          type: 'text',
          access: {
            read: admins,
          },
          admin: {
            readOnly: true,
          },
        },
      ],
    },
  ],
  endpoints: [
    {
      path: '/parse',
      method: 'post',
      handler: withEndpointErrorHandler(async (req, res) => {
        if (!isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' })

        const text = typeof req.body?.text === 'string' ? req.body.text.slice(0, 10_000) : ''
        if (!text.trim()) return res.status(400).json({ error: 'Missing text' })

        const { parseEventText } = await import('../../utilities/parseEventText')
        return res.json(parseEventText(text))
      }),
    },
    {
      path: '/ics',
      method: 'get',
      handler: async (req, res) => {
        const { payload } = req

        // `event` returns a single event as a downloadable .ics file, which is
        // what the per-event "Add to calendar" action links to.
        const rawEvent = req.query?.event
        const requestedEventId = Array.isArray(rawEvent) ? rawEvent[0] : rawEvent

        if (requestedEventId !== undefined) {
          // Event ids are a custom text field on this collection (not Mongo
          // ObjectIds), so accept any trimmed non-empty value of sane length.
          const eventId = typeof requestedEventId === 'string' ? requestedEventId.trim() : ''
          if (!eventId || eventId.length > 256) {
            return res.status(400).json({ error: 'Invalid event id' })
          }

          const where: Where = { id: { equals: eventId } }

          // Drafts stay private, but admins previewing a draft can still add it.
          if (!isAdmin(req.user)) {
            where._status = { equals: 'published' }
          }

          const { docs } = await payload.find({
            collection: 'events',
            where,
            limit: 1,
            depth: 0,
          })

          const event = docs[0]
          if (!event) return res.status(404).json({ error: 'Event not found' })

          res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${getEventFilename(event.name)}"`,
          )
          return res.send(buildCalendar([event]))
        }

        // `categories` accepts a comma-separated list (or repeated query params)
        // of category values. Unknown values are ignored. With no valid category
        // selected the feed contains every published event.
        const rawCategories = req.query?.categories
        const requestedCategories = (Array.isArray(rawCategories) ? rawCategories : [rawCategories])
          .filter((value): value is string => typeof value === 'string')
          .flatMap(value => value.split(','))
          .map(value => value.trim())
          .filter(isEventCategory)

        const where: Where = { _status: { equals: 'published' } }

        if (requestedCategories.length > 0) {
          where.category = { in: requestedCategories }
        }

        // `user` scopes the feed to events the user has marked as interested.
        // Only accept a Mongo ObjectId shape so an invalid value cannot trigger
        // a database cast error.
        const rawUser = req.query?.user
        const userId =
          typeof rawUser === 'string' && /^[a-f\d]{24}$/i.test(rawUser.trim())
            ? rawUser.trim()
            : undefined

        if (userId) {
          where.interestedUsers = { in: [userId] }
        }

        const { docs: events } = await payload.find({
          collection: 'events',
          where,
          limit: 500,
          sort: '-date',
        })

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="events.ics"')
        return res.send(buildCalendar(events))
      },
    },
    {
      path: '/:id/interested',
      method: 'post',
      handler: withEndpointErrorHandler(async (req, res, next) => {
        const { toggleInterested } = await import('./Endpoints/toggleInterested')
        return toggleInterested(req, res, next)
      }),
    },
  ],
}

export default Events
