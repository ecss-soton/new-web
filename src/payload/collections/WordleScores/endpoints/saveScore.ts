import type { PayloadHandler } from 'payload/config'

export const saveScore: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  try {
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { date, solved, guesses, attempts, displayName } = req.body

    if (!date || solved === undefined || guesses === undefined) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    const today = new Date().toISOString().split('T')[0]
    if (date !== today) {
      res.status(400).json({ error: 'Invalid date' })
      return
    }

    const existing = await payload.find({
      collection: 'wordle-scores',
      where: {
        and: [{ user: { equals: user.id } }, { date: { equals: date } }],
      },
    })

    if (existing.totalDocs > 0) {
      res.status(409).json({ error: 'Already submitted for today' })
      return
    }

    const score = await payload.create({
      collection: 'wordle-scores',
      data: {
        user: user.id,
        displayName: displayName || user.name || user.username || 'Anonymous',
        date,
        solved,
        guesses,
        attempts: attempts || [],
      },
    })

    res.json({ success: true, score })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    payload.logger.error(message)
    res.status(500).json({ error: 'Failed to save score' })
  }
}
