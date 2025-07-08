import { LINK_FIELDS } from './link'
import { MEDIA_FIELDS } from './media'

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
  query Society($slug: String, $draft: Boolean) {
    Societies(where: { slug: { equals: $slug }}, limit: 1, draft: $draft) {
      docs {
        id
        slug
        name
        description
        logo {
          ${MEDIA_FIELDS}
        }
        email
        website
        susu
        github
        instagram
        discord
        links {
          link ${LINK_FIELDS()}
        }
        updatedAt
        createdAt
      }
    }
  }
`
