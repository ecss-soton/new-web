import { relationship } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

import { getArrayID } from '../../../utilities/getID'

export const validatePreferences: Validate = async (preferences, args) => {
  if (!preferences || preferences?.length === 0) {
    if (args.data?.RONPosition === undefined) {
      return 'Vote must include at least one preference'
    }
    return relationship(preferences, args)
  }
  const prefs = getArrayID(preferences)

  if (prefs.length !== new Set(prefs).size) {
    return 'Vote cannot have the same nomination multiple times'
  }

  return relationship(preferences, args)
}
