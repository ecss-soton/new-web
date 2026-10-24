/**
 * Server-side game availability, driven by the Payload `games` global.
 *
 * The request deliberately bypasses the Next data cache so an admin toggle
 * takes effect on the next request. If the CMS is unreachable the games stay
 * available (fail open) rather than taking the section down.
 */

interface GamesGlobalResponse {
  disabledGames?: unknown
}

const gameSettingsUrl = (): string | null => {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL
  return baseUrl ? `${baseUrl}/api/globals/games` : null
}

export const getDisabledGames = async (): Promise<Set<string>> => {
  const url = gameSettingsUrl()
  if (!url) return new Set()

  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return new Set()

    const settings = (await response.json()) as GamesGlobalResponse
    if (!Array.isArray(settings?.disabledGames)) return new Set()

    return new Set(
      settings.disabledGames.filter((value): value is string => typeof value === 'string'),
    )
  } catch {
    return new Set()
  }
}

export const isGameDisabled = async (slug: string): Promise<boolean> =>
  (await getDisabledGames()).has(slug)
