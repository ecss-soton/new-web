import type { PayloadHandler } from 'payload/config'

export const updateDisplayName: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { displayName } = req.body

  if (!displayName?.trim()) {
    res.status(400).json({ error: 'Display name is required' })
    return
  }

  try {
    const latest = await payload.find({
      collection: 'wordle-scores',
      where: { user: { equals: user.id } },
      sort: '-createdAt',
      limit: 1,
    })

    if (latest.totalDocs === 0) {
      res.status(404).json({ error: 'No scores found. Play a game first!' })
      return
    }

    const updated = await payload.update({
      collection: 'wordle-scores',
      id: latest.docs[0].id,
      data: { displayName: displayName.trim() },
    })

    res.json({ success: true, displayName: updated.displayName })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    payload.logger.error(message)
    res.status(500).json({ error: 'Failed to update display name' })
  }
}
