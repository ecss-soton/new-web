export const EVENTS = `
    query Events {
        Events(limit: 300) {
            docs {
                id
                interestedCount
            }
        }
    }
`
