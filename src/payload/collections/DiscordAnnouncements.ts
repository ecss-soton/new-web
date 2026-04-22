import type { CollectionConfig } from 'payload/types'

import { adminsOrPublished } from '../access/adminsOrPublished'

const DiscordAnnouncements: CollectionConfig = {
  slug: 'discord-announcements',
  access: {
    read: adminsOrPublished,
    create: () => false, // only webhook
    update: () => false,
    delete: () => false,
  },
  admin: {
    useAsTitle: 'content',
    defaultColumns: ['content', 'author', 'createdAt'],
  },
  fields: [
    {
      name: 'discordMessageId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'author',
      type: 'text',
      required: true,
    },
    {
      name: 'url',
      type: 'text',
    },
    {
      name: 'authorAvatarUrl',
      type: 'text',
    },
  ],
  endpoints: [
    {
      path: '/webhook',
      method: 'post',
      handler: async (req, res, next) => {
        try {
          const { toggleWebhook } = await import('./Endpoints/discordWebhook')
          return toggleWebhook(req, res, next)
        } catch (e: unknown) {
          req.payload.logger.error(e)
          return res.status(500).json({ error: 'Internal Server Error' })
        }
      },
    },
  ],
}

export default DiscordAnnouncements
