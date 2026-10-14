import type { Block } from 'payload/types'

import { spanField } from '../../fields/span'

export const SectionRule: Block = {
  slug: 'sectionRule',
  labels: {
    singular: 'Section Rule',
    plural: 'Section Rules',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
    },
    {
      name: 'subheading',
      type: 'text',
    },
    spanField('sectionRuleSpan'),
  ],
}
