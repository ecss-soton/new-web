import type { PayloadHandler } from 'payload/config'

export const toggleInterested: PayloadHandler = async (req, res) => {
  const { user, payload } = req
  const eventId = req.params.id

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const event = await payload.findByID({
      collection: 'events',
      id: eventId,
      depth: 0,
      showHiddenFields: true,
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const getUserId = (u: any): any => (typeof u === 'string' ? u : u.id)
    const interestedUsers = (event.interestedUsers || []).map(getUserId)
    const isInterested = interestedUsers.includes(user.id)

    let updatedEvent

    if (isInterested) {
      updatedEvent = await payload.update({
        collection: 'events',
        id: eventId,
        data: {
          interestedUsers: interestedUsers.filter(id => String(id) !== String(user.id)),
          interestedCount: Math.max(0, (event.interestedCount || 0) - 1),
        },
        overrideAccess: true,
      })
    } else {
      updatedEvent = await payload.update({
        collection: 'events',
        id: eventId,
        data: {
          interestedUsers: [...interestedUsers, user.id],
          interestedCount: (event.interestedCount || 0) + 1,
        },
        overrideAccess: true,
      })
    }

    const userDoc = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 0,
    })
    const getEventId = (e: any): any => (typeof e === 'string' ? e : e.id)
    const userEvents = (userDoc.interestedEvents || []).map(getEventId)

    if (isInterested) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          interestedEvents: userEvents.filter(id => String(id) !== String(eventId)),
        },
        overrideAccess: true,
      })
    } else {
      if (!userEvents.some(id => String(id) === String(eventId))) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            interestedEvents: [...userEvents, eventId],
          },
          overrideAccess: true,
        })
      }
    }

    return res
      .status(200)
      .json({ interestedCount: updatedEvent.interestedCount, isInterested: !isInterested })
  } catch (err: unknown) {
    req.payload.logger.error(err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
