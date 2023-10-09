import type { CollectionConfig } from 'payload/types';
import { v4 as uuidv4 } from 'uuid';
import { admins } from '../../access/admins';
import Groups from '../groups';
import { adminOrNominee } from './access/nominees';
import { joinNomination } from './endpoints/joinNomination';
import { beforeVoting } from './access/beforeVoting';
import { addOwnId } from './validate/addOwnId';

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
      // TODO: Add populated nominee like in comments
      // TODO: Ensure the same nominee is not running for the same non dropped out positions
      name: 'nominee',
      label: 'Nominee',
      type: 'relationship',
      hasMany: true,
      minRows: 1,
      maxRows: 3,
      required: true,
      relationTo: 'users',
      access: {
        // Force nominee to add own user id.
        create: admins,
        // Don't allow nominees to remove themselves
        update: admins,
      },
      defaultValue: ({ user }) => user.id,
    },
    {
      name: 'nickname',
      label: 'Nickname',
      type: 'text',
    },
    {
      name: 'manifesto',
      label: 'Manifesto',
      type: 'richText',
    },
    {
      name: 'position',
      type: 'relationship',
      required: true,
      relationTo: 'positions',
      hasMany: false,
      access: {
        update: beforeVoting,
      },
    },
    {
      name: 'election',
      type: 'relationship',
      required: true,
      relationTo: 'elections',
      hasMany: false,
      access: {
        update: beforeVoting,
      },
      filterOptions: ({ data }) => ({
        positions: {
          contains: data.position,
        },
      }),
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
      access: {
        update: beforeVoting,
      },
    },
    {
      name: 'supporters',
      label: 'Supporters',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      access: {
        update: beforeVoting,
      },
      validate: addOwnId,
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
      path: '/:id/join/:key',
      method: 'post',
      handler: joinNomination,
    },
  ],
};

export default Nominations;
