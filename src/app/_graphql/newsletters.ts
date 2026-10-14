import { ARTICLE, BRIEFS, FIGURE, SECTION_RULE } from './blocks'
import { MEDIA_FIELDS } from './media'
import { META } from './meta'

export const NEWSLETTERS = `
  query Newsletters {
    Newsletters(limit: 100, sort: "-publishedAt") {
      docs {
        id
        slug
        title
        issueNumber
        publishedAt
        summary
        coverImage {
          ${MEDIA_FIELDS}
        }
      }
    }
  }
`

export const NEWSLETTER = `
  query Newsletter($slug: String, $draft: Boolean) {
    Newsletters(where: { slug: { equals: $slug }}, limit: 1, draft: $draft) {
      docs {
        id
        slug
        title
        issueNumber
        publishedAt
        summary
        coverImage {
          ${MEDIA_FIELDS}
        }
        printEdition {
          ${MEDIA_FIELDS}
        }
        layout {
          ${ARTICLE}
          ${FIGURE}
          ${BRIEFS}
          ${SECTION_RULE}
        }
        ${META}
      }
    }
  }
`
