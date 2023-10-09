import type { CollectionConfig } from 'payload/types';
import { v4 as uuidv4 } from 'uuid';
import { admins } from '../../access/admins';
import Groups from '../groups';
import { adminOrNominee } from './access/nominees';
import { joinNomination } from './endpoints/joinNomination';
import { beforeVoting } from './access/beforeVoting';
import { addOwnId } from './validate/addOwnId';
import { populateNominees } from './hooks/populateNominees';
import { nominationIsUnique } from './validate/nominationIsUnique';

const Nominations: CollectionConfig = {
  slug: 'nominations',
  access: {
    read: (): boolean => true,
    create: (): boolean => true,
    update: adminOrNominee,
    delete: admins,
  },
  hooks: {
    afterRead: [populateNominees],
  },
  admin: {
    group: Groups.Elections,
    defaultColumns: ['nickname', 'election', 'position'],
  },
  fields: [
    {
      name: 'nominees',
      label: 'Nominees',
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
      validate: nominationIsUnique,
      defaultValue: ({ user }) => user.id,
    },
    // This field is only used to populate the nominees data via the `populateUser` hook
    // This is because the `user` collection has access control locked to protect user privacy
    // GraphQL will also not return mutated user data that differs from the underlying schema
    {
      name: 'populatedNominees',
      type: 'array',
      admin: {
        readOnly: true,
        disabled: true,
      },
      access: {
        update: () => false,
        create: () => false,
      },
      fields: [
        {
          name: 'id',
          type: 'text',
        },
        {
          name: 'name',
          type: 'text',
        },
        {
          name: 'username',
          type: 'text',
        },
      ],
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
        and: [
          {
            positions: {
              contains: data.position,
            },
          },
          {
            nominationStart: {
              less_than_equal: data.createdAt,
            },
          },
          {
            nominationEnd: {
              greater_than_equal: data.createdAt,
            },
          },
        ],
      }),
    },
    {
      name: 'image',
      label: 'Picture of the nominees',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'droppedOut',
      label: 'Have the nominees dropped out',
      type: 'checkbox',
      access: {
        update: beforeVoting,
      },
      required: true,
      defaultValue: false,
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
