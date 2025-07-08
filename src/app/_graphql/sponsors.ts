import { LINK_FIELDS } from './link'
import { MEDIA_FIELDS } from './media'

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
  query Sponsor($slug: String, $draft: Boolean) {
    Sponsors(where: { slug: { equals: $slug }}, limit: 1, draft: $draft) {
      docs {
        id
        slug
        name
        level
        description
        logo {
          ${MEDIA_FIELDS}
        }
        websiteUrl
        links {
          link ${LINK_FIELDS()}
        }
        updatedAt
        createdAt
      }
    }
  }
`
