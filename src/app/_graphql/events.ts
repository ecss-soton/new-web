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

// export const EVENT = `
//   query Event($slug: String, $draft: Boolean) {
//     Events(where: { slug: { equals: $slug }}, limit: 1, draft: $draft)) {
//       docs {
//         id
//       }
//     }
//   }
// `
