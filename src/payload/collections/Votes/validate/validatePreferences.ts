import type { PaginatedDocs } from 'payload/dist/database/types'
import { relationship } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

import type { Nomination } from '../../../payload-types'
import { getArrayID, getID } from '../../../utilities/getID'

export const validatePreferences: Validate = async (preferences, args) => {
  if (!preferences || preferences?.length === 0) {
    return 'Vote must include at least one preference'
  }
  const prefs = getArrayID(preferences)

  if (prefs.length !== new Set(prefs).size) {
    return 'Vote cannot have the same nomination multiple times'
  }

  if (args.payload) {
    const { election, position } = args.data

    const result: PaginatedDocs<Nomination> = await args.payload.find({
      collection: 'nominations',
      depth: 0,
      pagination: false,
      where: {
        and: [
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
        ],
      },
    })

    for (const pref of prefs) {
      const nomination = result.docs.findIndex(v => v.id === pref)
      if (nomination === -1) {
        return 'Could not find nomination.'
      }

      result.docs.splice(nomination, 1)
    }

    if (!result.docs.every(doc => doc.droppedOut)) {
      return 'Does not contain all non-dropped out nominations.'
    }
  }

  return relationship(preferences, args)
}
