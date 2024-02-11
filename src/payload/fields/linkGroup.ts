import type { ArrayField } from 'payload/dist/fields/config/types';
import type { Field } from 'payload/types';

import type { LinkAppearances } from './link';
import link from './link';

import deepMerge from '../utilities/deepMerge';

// eslint-disable-next-line no-unused-vars
type LinkGroupType = (options?: {
  appearances?: LinkAppearances[] | false
  overrides?: Partial<ArrayField>
}) => Field

const linkGroup: LinkGroupType = ({ appearances, overrides = {} } = {}) => {
  const generatedLinkGroup: Field = {
    name: 'links',
    fields: [
      link({
        appearances,
      }),
    ],
    type: 'array',
  };

  return deepMerge(generatedLinkGroup, overrides);
};

export default linkGroup;
