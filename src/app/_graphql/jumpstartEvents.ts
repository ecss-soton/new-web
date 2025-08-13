// import { LINK_FIELDS } from './link'
import { MEDIA_FIELDS } from './media'

export const JUMPSTARTEVENTS = `
  query JumpstartEvents {
    JumpstartEvents(limit: 300) {
      docs {
        slug
      }
    }
  }
`

export const JUMPSTARTEVENT = `
  query JumpstartEvent($slug: String) {
    JumpstartEvent(where: { slug: { equals: $slug }}, limit: 1) {
      docs {
        id
        slug
        title
        description
        image {
          ${MEDIA_FIELDS}
        }
        link
        date
        endTime
        location
        updatedAt
        createdAt
      }
    }
  }
`
