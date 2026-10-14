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
                lumaUrl
                discordUrl
                isJumpstart
                category
                sortOrder
                mapsUrl
                latitude
                longitude
                interestedCount
                discordInterestedCount
                image {
                    ${MEDIA_FIELDS}
                }
            }
        }
    }
`
