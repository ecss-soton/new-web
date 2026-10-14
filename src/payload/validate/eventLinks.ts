import { testMatchesRegex } from './isAnInt'

export const isLumaUrl = testMatchesRegex(/^https:\/\/(?:lu\.ma|luma\.com)\/\S+$/i)

export const isDiscordUrl = testMatchesRegex(
  /^https:\/\/(?:discord\.com\/events\/\d+\/\d+|(?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+\?event=\d+)\/?$/i,
)

/**
 * Extract the Discord guild/event ids from a Discord event or invite link.
 * Invite links (`discord.gg/...?event=`) do not contain the guild id, so
 * callers fall back to `DISCORD_GUILD_ID`.
 */
export function parseDiscordUrl(url?: string | null): { guildId?: string; eventId: string } | null {
  if (!url) return null

  const event = url.match(/discord\.com\/events\/(\d+)\/(\d+)/)
  if (event) return { guildId: event[1], eventId: event[2] }

  const invite = url.match(/(?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+\?event=(\d+)/)
  return invite ? { eventId: invite[1] } : null
}
