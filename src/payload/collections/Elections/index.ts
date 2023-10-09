import type { CollectionConfig } from 'payload/types';

import { admins } from '../../access/admins';
import Groups from '../groups';
import { isAfterNomination, isNominationConstitutional, isVotingConstitutional } from './validate/dateValidate';

const Elections: CollectionConfig = {
  slug: 'elections',
  access: {
    read: (): boolean => true,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Elections,
    defaultColumns: ['name', 'nominationStart', 'votingEnd', 'positions'],
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'nominationStart',
      label: 'Nomination Start Time',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'nominationEnd',
      label: 'Nomination End Time',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      validate: isNominationConstitutional,
    },
    {
      name: 'votingStart',
      label: 'Voting Start Time',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      validate: isAfterNomination,
      required: true,
    },
    {
      name: 'votingEnd',
      label: 'Voting End Time',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      validate: isVotingConstitutional,
      required: true,
    },
    {
      name: 'positions',
      type: 'relationship',
      required: true,
      relationTo: 'positions',
      hasMany: true,
      admin: {
        allowCreate: true,
      },
    },
  ],
};

export default Elections;
