import {
  ARCHIVE_BLOCK,
  BUTTON,
  CALL_TO_ACTION,
  CONTENT,
  HOME_TOP,
  INTRO,
  MEDIA_BLOCK,
  NEXT_EVENT,
} from './blocks'
import { LINK_FIELDS } from './link'
import { MEDIA } from './media'
import { META } from './meta'

export const PAGES = `
  query Pages {
    Pages(limit: 300)  {
      docs {
        slug
      }
    }
  }
`

export const PAGE = `
  query Page($slug: String, $draft: Boolean) {
    Pages(where: { slug: { equals: $slug }}, limit: 1, draft: $draft) {
      docs {
        id
        title
        hero {
          type
          richText
          title
          links {
            link ${LINK_FIELDS()}
          }
          ${MEDIA}
        }
        layout {
          ${CONTENT}
          ${CALL_TO_ACTION}
          ${CONTENT}
          ${MEDIA_BLOCK}
          ${ARCHIVE_BLOCK}
          ${HOME_TOP}
          ${INTRO}
          ${NEXT_EVENT}
          ${BUTTON}
        }
        ${META}
      }
    }
  }
`
