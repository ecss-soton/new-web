import type { CollectionConfig } from 'payload/types'
import ical from 'ical-generator'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
dayjs.extend(utc)
dayjs.extend(timezone)

import { admins } from '../access/admins'
import { adminsOrPublished } from '../access/adminsOrPublished'
import { isHTTPS } from '../validate/isHTTPS'

const Events: CollectionConfig = {
  slug: 'events',
  access: {
    read: adminsOrPublished,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'name', 'date'],
  },
  versions: {
    drafts: true,
  },
  fields: [
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
          displayFormat: 'dd-MM-yyyy hh:mm',
        },
      },
    },
    {
      name: 'endTime',
      label: 'End Time',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'timeOnly',
          displayFormat: 'hh:mm',
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
      type: 'text',
    },
    {
      name: 'link',
      label: 'Any associated links',
      type: 'text',
      validate: isHTTPS,
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
  ],
  endpoints: [
    {
      path: '/ics',
      method: 'get',
      handler: async (req, res) => {
        const { payload } = req
        const { docs: events } = await payload.find({
          collection: 'events',
          where: { _status: { equals: 'published' } },
          limit: 500,
          sort: '-date',
        })

        const calendar = ical({
          name: 'ECSS Events',
          timezone: 'Europe/London',
        })

        events.forEach(event => {
          // 1. Correctly shift UTC from DB to London Wall-Clock time
          const start = dayjs(event.date).tz('Europe/London')

          let end
          if (event.endTime) {
            // 2. Use dayjs(value).tz() to ensure UTC-to-London conversion happens
            const endT = dayjs(event.endTime).tz('Europe/London')
            end = start.hour(endT.hour()).minute(endT.minute()).second(0)

            // 3. If end time is the same as or before start (e.g. overnight), add a day
            if (end.isSame(start) || end.isBefore(start)) {
              end = end.add(1, 'hour') // Default to 1 hour if they match exactly
            }
          } else {
            end = start.add(1, 'hour')
          }

          calendar.createEvent({
            id: event.id,
            // 4. We pass a native Date, but tell the event specifically to use London.
            // This forces the TZID=Europe/London tag into the .ics file.
            start: start.toDate(),
            end: end.toDate(),
            timezone: 'Europe/London',
            summary: event.name,
            description: event.description || '',
            location: event.location || '',
            url: event.link || '',
          })
        })

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="events.ics"')
        return res.send(calendar.toString())
      },
    },
    {
      path: '/:id/interested',
      method: 'post',
      handler: async (req, res, next) => {
        try {
          const { toggleInterested } = await import('./Endpoints/toggleInterested')
          return toggleInterested(req, res, next)
        } catch (e: unknown) {
          req.payload.logger.error(e)
          return res.status(500).json({ error: 'Internal Server Error' })
        }
      },
    },
  ],
}

export default Events
