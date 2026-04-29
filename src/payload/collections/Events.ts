import ical from 'ical-generator'
import moment from 'moment-timezone'
import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'
import { adminsOrPublished } from '../access/adminsOrPublished'
import { withEndpointErrorHandler } from '../utilities/endpointHandler'
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
        return data
      },
    ],
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
          // 1. Convert UTC from database to London Wall-Clock time (matches your frontend)
          const start = moment.utc(event.date).tz('Europe/London')

          let end
          if (event.endTime) {
            // 2. Do the same for the end time
            const endT = moment.utc(event.endTime).tz('Europe/London')

            // 3. Take the start date and apply the hours/minutes from the end time
            end = start.clone().hour(endT.hour()).minute(endT.minute()).second(0)

            // 4. Handle events that end after midnight
            if (end.isSameOrBefore(start)) {
              end.add(1, 'day')
            }
          } else {
            end = start.clone().add(1, 'hour')
          }

          calendar.createEvent({
            id: event.id,
            // Pass the moment objects directly
            start: start,
            end: end,
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
      handler: withEndpointErrorHandler(async (req, res, next) => {
        const { toggleInterested } = await import('./Endpoints/toggleInterested')
        return toggleInterested(req, res, next)
      }),
    },
  ],
}

export default Events
