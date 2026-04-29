import { ENTITY_BASE, ENTITY_META } from './blocks'

export const SPONSORS = `
  query Sponsors {
    Sponsors(limit: 300) {
      docs {
        slug
      }
    }
  }
`

export const SPONSOR = `
  query Sponsor($slug: String) {
    Sponsors(where: { slug: { equals: $slug }}, limit: 1) {
      docs {
        ${ENTITY_BASE}
        level
        websiteUrl
        ${ENTITY_META}
      }
    }
  }
`
