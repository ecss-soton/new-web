import type { PayloadHandler } from 'payload/config'
import type { PaginatedDocs } from 'payload/dist/database/types'

import type { Nomination } from '../../../payload-types'

export const joinNomination: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  console.log(req.params)
  console.log(user)

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
          joinUUID: {
            equals: req.params.key,
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

  const nominees = nominations.docs[0].nominees as string[]

  if (nominees.includes(user.id)) {
    res.status(403).json({ error: 'You are already a nominee for this nomination.' })
    return
  }
  nominees.push(user.id)

  try {
    await payload.update({
      id: req.params.id,
      collection: 'nominations',
      data: {
        nominees: nominees,
      },
    })

    res.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    payload.logger.error(message)

    res.status(503).json({ error: message })
  }
}
