import { relationship } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

import { getID } from '../../../utilities/getID'
import { checkRole } from '../../Users/checkRole'

export const addOwnId: Validate = async (userList: string[], args) => {
  if (args.user && checkRole(['admin'], args.user)) {
    return true
  }

  const nominations = await args.payload.find({
    collection: 'nominations',
    depth: 0,
    where: {
      and: [
        {
          election: {
            equals: getID(args.data.election),
          },
          position: {
            equals: getID(args.data.position),
          },
          supporters: {
            in: [args.user.id],
          },
          id: {
            not_equals: args.data.id,
          },
        },
      ],
    },
  })

  if (nominations.totalDocs > 0) {
    return 'Cannot support multiple nominees for the same position.'
  }

  if (args.operation === 'create') {
    if (userList.length === 1 && userList[0] !== args.user.id) {
      return 'Should only use own id.'
    }
    if (userList.length > 1) {
      return 'Cannot add multiple supporters'
    }
  } else if (args.operation === 'update' && args.payload) {
    const nomination = await args.payload.findByID({
      collection: 'nominations',
      id: args.data.id,
      depth: 0,
    })
    const oldUserList: string[] = nomination.supporters

    // Nothing has changed
    if (
      oldUserList.length === userList.length &&
      oldUserList.every((elem, idx) => elem === userList[idx])
    ) {
      return true
    }

    for (const user of userList) {
      if (user === args.user.id) {
        continue
      }
      if (!oldUserList.includes(user)) {
        return 'Added user not from old list.'
      }
    }

    for (const oldUser of oldUserList) {
      if (oldUser === args.user.id) {
        continue
      }
      if (!userList.includes(oldUser)) {
        return 'Removed user from old list.'
      }
    }

    if (userList.length !== new Set(userList).size) {
      return 'Contains the same user multiple times'
    }
  }

  return relationship(userList, args)
}
