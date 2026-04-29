import { CONTENT_LAYOUT_BLOCKS, HERO_FIELDS } from './blocks'
import { META } from './meta'

export const PROJECTS = `
  query Projects {
    Projects(limit: 300) {
      docs {
        slug
      }
    }
  }
`

export const PROJECT = `
  query Project($slug: String, $draft: Boolean) {
    Projects(where: { slug: { equals: $slug }}, limit: 1, draft: $draft) {
      docs {
        id
        title
        categories {
          title
        }
        createdAt
        ${HERO_FIELDS}
        layout {
          ${CONTENT_LAYOUT_BLOCKS}
        }
        relatedProjects {
          id
          slug
          title
          ${META}
        }
        ${META}
      }
    }
  }
`
