import type { Field } from 'payload/types';

import deepMerge from '../utilities/deepMerge';
import formatSlug from '../utilities/formatSlug';

// eslint-disable-next-line no-unused-vars
type Slug = (fieldToUse?: string, overrides?: Partial<Field>) => Field

export const slugField: Slug = (fieldToUse = 'title', overrides = {}) => deepMerge<Field, Partial<Field>>(
  {
    name: 'slug',
    admin: {
      position: 'sidebar',
    },
    hooks: {
      beforeValidate: [formatSlug(fieldToUse)],
    },
    index: true,
    label: 'Slug',
    type: 'text',
  },
  overrides,
);
