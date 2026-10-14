import type { Payload } from 'payload'

const DISCORD_API = 'https://discord.com/api/v10'

/**
 * Fetch the current Discord `user_count` for every upcoming event that is
 * linked to a Discord scheduled event and store it in `discordInterestedCount`.
 *
 * No-ops unless `DISCORD_BOT_TOKEN` is configured. Runs sequentially to stay
 * well within Discord's rate limits.
 */
export async function syncDiscordEvents(payload: Payload): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN
  const fallbackGuildId = process.env.DISCORD_GUILD_ID

  if (!token) return

  const { docs } = await payload.find({
    collection: 'events',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: {
      and: [
        { discordEventId: { exists: true } },
        { date: { greater_than_equal: new Date().toISOString() } },
      ],
    },
  })

  for (const event of docs) {
    const guildId = event.discordGuildId || fallbackGuildId
    if (!guildId || !event.discordEventId) continue

    try {
      const res = await fetch(
        `${DISCORD_API}/guilds/${guildId}/scheduled-events/${event.discordEventId}`,
        { headers: { Authorization: `Bot ${token}` } },
      )

      if (!res.ok) throw new Error(`Discord API responded ${res.status}`)

      const data = (await res.json()) as { user_count?: number }

      await payload.update({
        collection: 'events',
        id: event.id,
        overrideAccess: true,
        data: {
          discordInterestedCount: data.user_count ?? 0,
          discordLastSyncedAt: new Date().toISOString(),
          discordSyncError: null,
        },
      })
    } catch (error: unknown) {
      payload.logger.error(`Discord sync failed for event ${event.id}: ${String(error)}`)
      await payload.update({
        collection: 'events',
        id: event.id,
        overrideAccess: true,
        data: { discordSyncError: String(error).slice(0, 200) },
      })
    }
  }
}
