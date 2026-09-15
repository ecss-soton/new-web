// Shared, dependency-free City Challenge logic used by the Payload collection,
// the server page, and the client map. Keep this module free of server-only,
// Payload, or React imports so it can be bundled on both sides.

export const CITY_CHALLENGE_CELL_DEG = 0.002

export const MAX_DISCOVERY_CELLS = 20000
export const MAX_DISCOVERY_BATCH = 200

// Axis-aligned bounding box for the Southampton play area. Exploration % is
// measured against the grid cells that fall inside this rectangle.
export const CITY_CHALLENGE_BOUNDS = {
  minLat: 50.896355,
  maxLat: 50.939266,
  minLng: -1.418933,
  maxLng: -1.378409,
} as const

export interface CityChallengeBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export interface CellBounds {
  latMin: number
  latMax: number
  lngMin: number
  lngMax: number
}

export interface TeamLike {
  teamLead?: unknown
  members?: unknown
}

export interface Coordinate {
  lat: number
  lng: number
}

/** Pulls a stable ID out of a relationship value that may be an ID or a doc. */
export function relationshipId(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) {
    return String((value as { id: unknown }).id)
  }
  return ''
}

export function teamLeadId(team: TeamLike | null | undefined): string {
  return relationshipId(team?.teamLead)
}

/** Deduplicated member IDs from a team-like object, excluding nothing. */
export function memberIds(team: TeamLike | null | undefined): string[] {
  if (!Array.isArray(team?.members)) return []
  const seen = new Set<string>()
  const ids: string[] = []
  for (const member of team.members) {
    const id = relationshipId(member)
    if (id && !seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

export function isTeamMember(team: TeamLike, userId: string): boolean {
  return teamLeadId(team) === userId || memberIds(team).includes(userId)
}

export function isTeamLead(team: TeamLike, userId: string): boolean {
  return teamLeadId(team) === userId
}

export function latLngToCell(lat: number, lng: number): string {
  return `${Math.floor(lat / CITY_CHALLENGE_CELL_DEG)}:${Math.floor(lng / CITY_CHALLENGE_CELL_DEG)}`
}

export function parseCellId(cellId: string): { latIdx: number; lngIdx: number } | null {
  if (typeof cellId !== 'string') return null
  const parts = cellId.split(':')
  if (parts.length !== 2) return null
  const latIdx = Number(parts[0])
  const lngIdx = Number(parts[1])
  if (!Number.isFinite(latIdx) || !Number.isFinite(lngIdx)) return null
  return { latIdx, lngIdx }
}

/** Geographic bounds of a grid cell ID, or null when malformed. */
export function cellBounds(cellId: string): CellBounds | null {
  const parsed = parseCellId(cellId)
  if (!parsed) return null
  const { latIdx, lngIdx } = parsed
  return {
    latMin: latIdx * CITY_CHALLENGE_CELL_DEG,
    latMax: (latIdx + 1) * CITY_CHALLENGE_CELL_DEG,
    lngMin: lngIdx * CITY_CHALLENGE_CELL_DEG,
    lngMax: (lngIdx + 1) * CITY_CHALLENGE_CELL_DEG,
  }
}

/**
 * Returns a deduplicated array of cell-ID strings from whatever is stored in
 * discoveredAreas, migrating the legacy {lat,lng}[] format on first access.
 */
export function migrateDiscoveredAreas(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  if (typeof raw[0] === 'string') {
    return [...new Set(raw.filter((cell): cell is string => typeof cell === 'string'))]
  }
  // Legacy format: array of {lat, lng} point objects.
  const cells = (raw as Array<{ lat?: unknown; lng?: unknown }>)
    .filter(
      (p): p is { lat: number; lng: number } =>
        typeof p.lat === 'number' && typeof p.lng === 'number',
    )
    .map(p => latLngToCell(p.lat, p.lng))
  return [...new Set(cells)]
}

export function parseCoordinate(lat: unknown, lng: unknown): Coordinate | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

function boundsCellRange(bounds: CityChallengeBounds): CellBounds {
  return {
    latMin: Math.floor(bounds.minLat / CITY_CHALLENGE_CELL_DEG),
    latMax: Math.floor(bounds.maxLat / CITY_CHALLENGE_CELL_DEG),
    lngMin: Math.floor(bounds.minLng / CITY_CHALLENGE_CELL_DEG),
    lngMax: Math.floor(bounds.maxLng / CITY_CHALLENGE_CELL_DEG),
  }
}

/** Total grid cells contained within the given bounds. */
export function getBoundsCellCount(bounds: CityChallengeBounds = CITY_CHALLENGE_BOUNDS): number {
  const range = boundsCellRange(bounds)
  const latCount = range.latMax - range.latMin + 1
  const lngCount = range.lngMax - range.lngMin + 1
  if (latCount <= 0 || lngCount <= 0) return 0
  return latCount * lngCount
}

/** Percentage (0-100) of the Southampton play area the team has revealed. */
export function getExploredPercentage(
  discoveredAreas: unknown,
  bounds: CityChallengeBounds = CITY_CHALLENGE_BOUNDS,
): number {
  const total = getBoundsCellCount(bounds)
  if (total <= 0) return 0

  const range = boundsCellRange(bounds)
  const cells = migrateDiscoveredAreas(discoveredAreas)

  let explored = 0
  for (const cell of cells) {
    const parsed = parseCellId(cell)
    if (!parsed) continue
    if (
      parsed.latIdx >= range.latMin &&
      parsed.latIdx <= range.latMax &&
      parsed.lngIdx >= range.lngMin &&
      parsed.lngIdx <= range.lngMax
    ) {
      explored++
    }
  }

  return Math.min(100, (explored / total) * 100)
}
