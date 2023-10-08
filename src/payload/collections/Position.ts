import type { CollectionConfig } from 'payload/types';

import { admins } from '../access/admins';
import Groups from './groups';

const Positions: CollectionConfig = {
  slug: 'positions',
  access: {
    read: (): boolean => true,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Elections,
    defaultColumns: ['name', 'importance', 'description'],
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      required: true,
    },
    {
      name: 'importance',
      label: 'Importance (where 1 is most important)',
      type: 'number',
      required: true,
      unique: true,
      min: 1,
      admin: {
        step: 1,
      },
    },
  ],
};

export default Positions;
