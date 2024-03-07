import type { PayloadHandler } from 'payload/config'
import type { PaginatedDocs } from 'payload/dist/database/types'

import type { Nomination } from '../../../payload-types'
import { getArrayID } from '../../../utilities/getID'

export const toggleSupport: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const nominations: PaginatedDocs<Nomination> = await payload.find({
    collection: 'nominations',
    where: {
      and: [
        {
          id: {
            equals: req.params.id,
          },
        },
        {
          'election.votingStart': {
            greater_than: new Date(),
          },
        },
      ],
    },
    depth: 0,
  })

  if (!nominations || nominations.docs.length !== 1) {
    res.status(404).json({ error: 'Could not find nomination.' })
    return
  }

  const supporters = getArrayID(nominations.docs[0].supporters)

  if (supporters.includes(user.id)) {
    supporters.splice(supporters.indexOf(user.id), 1)
  } else {
    supporters.push(user.id)
  }

  try {
    await payload.update({
      id: req.params.id,
      collection: 'nominations',
      depth: 0,
      data: {
        supporters: supporters,
      },
    })

    res.json({ success: true, supporting: supporters.includes(user.id), supporters })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    payload.logger.error(message)

    res.status(503).json({ error: message })
  }
}
