import type { CollectionConfig } from 'payload/types'
import { v4 as uuidv4 } from 'uuid'

import { admins } from '../../access/admins'
import Groups from '../groups'
import { adminOrNominee } from './access/nominees'
import { MaxNominees } from './constants'
import { joinNomination } from './endpoints/joinNomination'

const Nominations: CollectionConfig = {
  slug: 'nominations',
  access: {
    read: (): boolean => true,
    create: (): boolean => true,
    update: adminOrNominee,
    delete: admins,
  },
  admin: {
    group: Groups.Elections,
    defaultColumns: ['nickname', 'election', 'position'],
  },
  fields: [
    {
      name: 'nominee',
      label: 'Nominee',
      type: 'relationship',
      hasMany: true,
      minRows: 1,
      maxRows: MaxNominees,
      required: true,
      relationTo: 'users',
    },
    {
      name: 'nickname',
      label: 'Nickname',
      type: 'text',
    },
    {
      name: 'manifesto',
      label: 'Manifesto',
      type: 'text',
    },
    {
      name: 'position',
      type: 'relationship',
      required: true,
      relationTo: 'positions',
      hasMany: false,
      access: {
        update: () => false,
      },
    },
    {
      name: 'election',
      type: 'relationship',
      required: true,
      relationTo: 'elections',
      hasMany: false,
      access: {
        update: () => false,
      },
    },
    {
      name: 'image',
      label: 'Picture of the nominee',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'droppedOut',
      label: 'Has the nominee dropped out',
      type: 'checkbox',
      //TODO: Only allow nominees to set themselves as dropped out.
    },
    {
      name: 'supporters',
      label: 'Supporters',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
    {
      name: 'joinUUID',
      label: 'UUID used to join nomination',
      type: 'text',
      defaultValue: () => uuidv4(),
      access: {
        read: adminOrNominee,
        create: () => false,
        update: () => false,
      },
    },
  ],
  endpoints: [
    {
      path: '/join/:key',
      method: 'post',
      handler: joinNomination,
    },
  ],
}

export default Nominations
