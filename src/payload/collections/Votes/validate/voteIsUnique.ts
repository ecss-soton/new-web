import { text } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

import { getID } from '../../../utilities/getID'

export const voteIsUnique: Validate = async (username: string, args) => {
  if (args.payload) {
    const { election, position } = args.data

    const result = await args.payload.find({
      collection: 'votes',
      depth: 0,
      limit: 1,
      where: {
        and: [
          {
            username: {
              equals: args.data.username,
            },
          },
          {
            election: {
              equals: getID(election),
            },
          },
          {
            position: {
              equals: getID(position),
            },
          },
          {
            id: {
              not_equals: args.operation === 'create' ? '' : args.data.id,
            },
          },
        ],
      },
    })

    if (result.totalDocs > 0) {
      return 'Vote is not unique.'
    }
  }

  return text(username, args)
}
