import { ENTITY_BASE, ENTITY_META } from './blocks'

export const SOCIETIES = `
  query Societies {
    Societies(limit: 300) {
      docs {
        slug
      }
    }
  }
`

export const SOCIETY = `
  query Society($slug: String) {
    Societies(where: { slug: { equals: $slug }}, limit: 1) {
      docs {
        ${ENTITY_BASE}
        email
        website
        susu
        github
        instagram
        discord
        ${ENTITY_META}
      }
    }
  }
`
