import { CONTENT_LAYOUT_BLOCKS, HERO_FIELDS } from './blocks'
import { META } from './meta'

export const POSTS = `
  query Posts {
    Posts(limit: 300) {
      docs {
        slug
      }
    }
  }
`

export const POST = `
  query Post($slug: String, $draft: Boolean) {
    Posts(where: { slug: { equals: $slug }}, limit: 1, draft: $draft) {
      docs {
        id
        title
        categories {
          title
        }
        createdAt
        publishedAt
        populatedAuthors {
          id
          name
        }
        ${HERO_FIELDS}
        layout {
          ${CONTENT_LAYOUT_BLOCKS}
        }
        enablePremiumContent
        relatedPosts {
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

export const POST_PREMIUM_CONTENT = `
  query Post($slug: String, $draft: Boolean) {
    Posts(where: { slug: { equals: $slug }}, limit: 1, draft: $draft) {
      docs {
        premiumContent {
          ${CONTENT_LAYOUT_BLOCKS}
        }
      }
    }
  }
`
