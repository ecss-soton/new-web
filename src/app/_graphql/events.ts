import { MEDIA_FIELDS } from './media'

export const EVENTS = `
    query Events {
        Events(limit: 300) {
            docs {
                id
                name
                date
                endTime
                location
                description
                link
                isJumpstart
                dayLabel
                sortOrder
                mapsUrl
                interestedCount
                image {
                    ${MEDIA_FIELDS}
                }
            }
        }
    }
`
