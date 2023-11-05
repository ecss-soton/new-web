import type { CollectionConfig } from 'payload/types';

import { admins } from '../../access/admins';
import Groups from '../groups';
import { saleActiveOrAdmin } from './access/saleActiveOrAdmin';
import { isDateCorrect } from '../Merch/validate/isDateCorrect';

const Merch: CollectionConfig = {
  slug: 'sales',
  access: {
    read: saleActiveOrAdmin,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Commerce,
    defaultColumns: ['name', 'saleStart', 'saleEnd'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'saleStart',
      type: 'date',
      required: true,
    },
    {
      name: 'saleEnd',
      type: 'date',
      validate: isDateCorrect,
      required: true,
    },
  ],
};

export default Merch;
