import type { PayloadHandler } from 'payload/config'

export const toggleWebhook: PayloadHandler = async (req, res) => {
  const { body, payload } = req

  // Basic Discord Webhook formatting:
  // Usually this would be driven by a Discord bot sending a post to us.
  // We'll extract: body.content, body.id (message id), body.author

  try {
    if (!body || !body.id) {
      return res.status(400).json({ error: 'Missing Discord Message ID' })
    }

    const { id, content, author, url } = body

    // Check if it already exists
    const existing = await payload.find({
      collection: 'discord-announcements',
      where: { discordMessageId: { equals: id } },
    })

    if (existing.totalDocs > 0) {
      // Update
      const updated = await payload.update({
        collection: 'discord-announcements',
        id: existing.docs[0].id,
        data: {
          content,
          author: author?.username || 'Unknown',
          url,
          authorAvatarUrl: author?.avatarUrl,
        },
      })
      return res.status(200).json(updated)
    }

    // Create
    const created = await payload.create({
      collection: 'discord-announcements',
      data: {
        discordMessageId: id,
        content: content || '',
        author: author?.username || 'Unknown',
        authorAvatarUrl: author?.avatarUrl,
        url: url,
      },
    })

    return res.status(201).json(created)
  } catch (err) {
    req.payload.logger.error(err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
