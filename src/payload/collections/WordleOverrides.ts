import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'

const WordleOverrides: CollectionConfig = {
  slug: 'wordle-overrides',
  access: {
    // Only admins may read overrides through the public REST/GraphQL API.
    // The /guess endpoint resolves overrides internally via the Payload local API
    // and never exposes the raw word to clients.
    read: admins,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['date', 'word'],
  },
  fields: [
    {
      name: 'date',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Date in YYYY-MM-DD format',
      },
    },
    {
      name: 'word',
      type: 'text',
      required: true,
      minLength: 5,
      maxLength: 5,
      admin: {
        description: '5-letter word to use for this date',
      },
    },
  ],
}

export default WordleOverrides
