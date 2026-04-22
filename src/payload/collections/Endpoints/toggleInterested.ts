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
      showHiddenFields: true,
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const interestedUsers = (event.interestedUsers || []).map((u: any) =>
      typeof u === 'string' ? u : u.id,)
    const isInterested = interestedUsers.includes(user.id)

    let updatedEvent

    if (isInterested) {
      updatedEvent = await payload.update({
        collection: 'events',
        id: eventId,
        data: {
          interestedUsers: interestedUsers.filter((id: string) => id !== user.id),
          interestedCount: Math.max(0, (event.interestedCount || 0) - 1),
        },
      })
    } else {
      updatedEvent = await payload.update({
        collection: 'events',
        id: eventId,
        data: {
          interestedUsers: [...interestedUsers, user.id],
          interestedCount: (event.interestedCount || 0) + 1,
        },
      })
    }

    const userDoc = await payload.findByID({
      collection: 'users',
      id: user.id,
      showHiddenFields: true,
    })
    const userEvents = (userDoc.interestedEvents || []).map((e: any) =>
      typeof e === 'string' ? e : e.id,)

    if (isInterested) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          interestedEvents: userEvents.filter((id: string) => id !== eventId),
        },
      })
    } else {
      if (!userEvents.includes(eventId)) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            interestedEvents: [...userEvents, eventId],
          },
        })
      }
    }

    return res
      .status(200)
      .json({ interestedCount: updatedEvent.interestedCount, isInterested: !isInterested })
  } catch (err) {
    req.payload.logger.error(err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
