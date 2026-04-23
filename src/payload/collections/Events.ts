import type { CollectionConfig } from 'payload/types'
import ical from 'ical-generator'

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
        const { payload } = req;

        // Fetch published events (similar to your Archive logic)
        const { docs: events } = await payload.find({
          collection: 'events',
          where: {
            _status: { equals: 'published' },
          },
          limit: 500, // Fetch a reasonable window of events
          sort: '-date',
        });

        const calendar = ical({ 
          name: 'My Society Events',
          timezone: 'Europe/London' 
        });

        events.forEach((event) => {
          // Construct the start date
          const startDate = new Date(event.date);
          
          // Construct end date: 
          // If endTime exists (time-only), we attach it to the event's date.
          // Otherwise, default to 1 hour duration.
          let endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
          
          if (event.endTime) {
            const endT = new Date(event.endTime);
            endDate = new Date(startDate);
            endDate.setHours(endT.getHours(), endT.getMinutes());
          }

          calendar.createEvent({
            id: event.id,
            start: startDate,
            end: endDate,
            summary: event.name,
            description: event.description || '',
            location: event.location || '',
            url: event.link || '',
          });
        });

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="events.ics"');
        return res.send(calendar.toString());
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
