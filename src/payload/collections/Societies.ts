import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'
import { testMatchesRegex } from '../validate/isAnInt'
import { isHTTPS } from '../validate/isHTTPS'

const Societies: CollectionConfig = {
  slug: 'societies',
  access: {
    read: (): boolean => true,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'name'],
  },
  fields: [
    {
      name: 'id',
      label: 'Society acronym (e.g. ECSS)',
      type: 'text',
      required: true,
      validate: testMatchesRegex(/^[a-z]+(?:-?[a-z]+)+$/i),
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'richText',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'website',
      label: 'The main website URL',
      type: 'text',
      validate: isHTTPS,
    },
    {
      name: 'github',
      label: 'The github username or organisation',
      type: 'text',
      validate: testMatchesRegex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i),
    },
    {
      name: 'instagram',
      label: 'Instagram username',
      type: 'text',
      validate: testMatchesRegex(/^(?!.*\.\.)(?!.*\.$)\w[\w.]{0,29}$/i),
    },
    {
      name: 'discord',
      label: 'Discord server invite link',
      type: 'text',
      validate: testMatchesRegex(/^https:\/\/discord.gg\/[a-zA-Z0-9]+$/),
    },
    {
      name: 'links',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
        },
        {
          name: 'url',
          type: 'text',
          validate: isHTTPS,
        },
      ],
    },
  ],
}

export default Societies
