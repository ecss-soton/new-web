import type { Page } from '../payload-types'

export const hackathonsPage: Partial<Page> = {
  title: 'Hackathons',
  slug: 'hackathons',
  _status: 'published',
  meta: {
    title: 'Hackathons',
    description: 'Internal, external and other societies’ hackathons.',
  },
  hero: {
    type: 'lowImpact',
    richText: [
      {
        type: 'h1',
        children: [
          {
            text: 'Hackathons',
          },
        ],
      },
      {
        type: 'p',
        children: [
          {
            text: 'Internal, external and other societies’ hackathons, all in one place.',
          },
        ],
      },
    ],
    media: undefined,
  },
  layout: [
    {
      blockName: 'Archive Block',
      blockType: 'archive',
      populateBy: 'collection',
      relationTo: 'hackathons',
      limit: 100,
      categories: [],
    },
  ],
}
