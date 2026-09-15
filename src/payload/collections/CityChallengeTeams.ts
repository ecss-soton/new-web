import type { CollectionConfig, PayloadRequest } from 'payload/types'

import { admins } from '../access/admins'
import { isAdmin } from '../access/isAdmin'
import type { CityChallengeTeam, User } from '../payload-types'

// Geographic grid cell size in degrees. Must match the constant in CityChallengeMap/index.tsx
// and the City Challenge page. At Southampton (~51°N): ≈222 m latitude, ≈140 m longitude.
const CELL_DEG = 0.002

// Safety bounds so a single team's fog-of-war JSON cannot grow without limit.
const MAX_DISCOVERY_CELLS = 20000
const MAX_DISCOVERY_BATCH = 200

type Payload = PayloadRequest['payload']

interface UserSummary {
  id: string
  name: string | null
  username: string | null
}

interface Roster {
  id: string
  name: string
  teamLead: UserSummary
  members: UserSummary[]
}

function latLngToCell(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL_DEG)}:${Math.floor(lng / CELL_DEG)}`
}

/**
 * Returns a deduplicated array of cell-ID strings from whatever is stored in
 * discoveredAreas, migrating the legacy {lat,lng}[] format on first access.
 */
function migrateDiscoveredAreas(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  if (typeof raw[0] === 'string') return [...new Set(raw as string[])]
  // Legacy format: array of {lat, lng} point objects.
  const cells = (raw as Array<{ lat?: unknown; lng?: unknown }>)
    .filter(
      (p): p is { lat: number; lng: number } =>
        typeof p.lat === 'number' && typeof p.lng === 'number',
    )
    .map(p => latLngToCell(p.lat, p.lng))
  return [...new Set(cells)]
}

/** Pulls a stable ID out of a relationship value that may be an ID or a doc. */
function relationshipId(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) {
    return String((value as { id: unknown }).id)
  }
  return ''
}

function teamLeadId(team: CityChallengeTeam): string {
  return relationshipId(team.teamLead)
}

function memberIds(team: CityChallengeTeam): string[] {
  if (!Array.isArray(team.members)) return []
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

function isTeamMember(team: CityChallengeTeam, userId: string): boolean {
  return teamLeadId(team) === userId || memberIds(team).includes(userId)
}

function isTeamLead(team: CityChallengeTeam, userId: string): boolean {
  return teamLeadId(team) === userId
}

function parseCoordinate(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

/** Loads a team without throwing, returning null when it does not exist. */
async function findTeam(payload: Payload, id: string): Promise<CityChallengeTeam | null> {
  try {
    const team = await payload.findByID({
      collection: 'city-challenge-teams',
      id,
      depth: 0,
    })
    return (team as CityChallengeTeam) ?? null
  } catch {
    return null
  }
}

/**
 * Resolves user IDs to safe display summaries (id/name/username only) using the
 * Local API with access control bypassed, so a team lead can always see member
 * names even though regular users cannot read each other's user documents.
 */
async function resolveUserSummaries(
  payload: Payload,
  ids: string[],
): Promise<Record<string, UserSummary>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return {}

  const result = await payload.find({
    collection: 'users',
    where: { id: { in: unique } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const map: Record<string, UserSummary> = {}
  for (const doc of result.docs as User[]) {
    map[doc.id] = {
      id: doc.id,
      name: doc.name ?? null,
      username: doc.username ?? null,
    }
  }
  return map
}

/** Builds the safe roster payload returned to the frontend. */
async function buildRoster(payload: Payload, team: CityChallengeTeam): Promise<Roster> {
  const leadId = teamLeadId(team)
  const memIds = memberIds(team)
  const summaries = await resolveUserSummaries(payload, [leadId, ...memIds])
  const fallback = (id: string): UserSummary => summaries[id] ?? { id, name: null, username: null }

  return {
    id: team.id,
    name: team.name,
    teamLead: fallback(leadId),
    members: memIds.map(fallback),
  }
}

/** Finds a user by ID or username, returning a safe summary. */
async function findUserByHandle(
  payload: Payload,
  args: { userId?: string; username?: string },
): Promise<UserSummary | null> {
  if (!args.userId && !args.username) return null

  const where = args.userId
    ? { id: { equals: args.userId } }
    : { username: { equals: args.username } }

  const result = await payload.find({
    collection: 'users',
    where,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const doc = result.docs[0] as User | undefined
  if (!doc) return null
  return { id: doc.id, name: doc.name ?? null, username: doc.username ?? null }
}

/** Returns another team that already contains the user, if any. */
async function findConflictingTeam(
  payload: Payload,
  userId: string,
  currentTeamId: string,
): Promise<CityChallengeTeam | null> {
  const teams = await payload.find({
    collection: 'city-challenge-teams',
    where: {
      or: [{ teamLead: { equals: userId } }, { members: { contains: userId } }],
    },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  return (teams.docs as CityChallengeTeam[]).find(t => t.id !== currentTeamId) ?? null
}

/** Set of user IDs already committed to any team other than the excluded one. */
async function committedUserIds(payload: Payload, excludeTeamId: string): Promise<Set<string>> {
  const teams = await payload.find({
    collection: 'city-challenge-teams',
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const ids = new Set<string>()
  for (const team of teams.docs as CityChallengeTeam[]) {
    if (team.id === excludeTeamId) continue
    const lead = teamLeadId(team)
    if (lead) ids.add(lead)
    for (const id of memberIds(team)) ids.add(id)
  }
  return ids
}

const CityChallengeTeams: CollectionConfig = {
  slug: 'city-challenge-teams',
  access: {
    // Only the team's lead/members (or an admin) may read a team document.
    read: ({ req: { user: reqUser } }) => {
      if (!reqUser) return false
      if (isAdmin(reqUser as User)) return true
      return {
        or: [{ teamLead: { equals: reqUser.id } }, { members: { contains: reqUser.id } }],
      }
    },
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'teamLead', 'members'],
    group: 'City Challenge',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Team Name',
    },
    {
      name: 'teamLead',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Team Lead',
      admin: {
        description: 'The user who can manage this team and mark challenges complete.',
      },
    },
    {
      name: 'members',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'Team Members',
      admin: {
        description: 'Users who are part of this team (excluding the team lead).',
      },
    },
    {
      name: 'completedChallenges',
      type: 'relationship',
      relationTo: 'city-challenge-locations',
      hasMany: true,
      label: 'Completed Challenges',
      admin: {
        description: 'Challenges marked as complete by the team lead.',
      },
    },
    {
      name: 'discoveredAreas',
      type: 'json',
      label: 'Discovered Areas',
      admin: {
        readOnly: true,
        description:
          'Array of fog-of-war grid cell IDs ("latIdx:lngIdx") revealed by the team. Managed via the discover endpoint.',
      },
    },
  ],
  endpoints: [
    {
      path: '/:id/discover',
      method: 'post',
      handler: async (req: PayloadRequest, res) => {
        try {
          const userId = req.user?.id
          if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
          }

          const teamId = req.params.id
          const team = await findTeam(req.payload, teamId)
          if (!team) {
            return res.status(404).json({ error: 'Team not found' })
          }

          if (!isTeamMember(team, userId)) {
            return res.status(403).json({ error: 'You are not a member of this team' })
          }

          const body = (req.body ?? {}) as { lat?: unknown; lng?: unknown; points?: unknown }
          let incoming: Array<{ lat: number; lng: number }> = []

          if (Array.isArray(body.points)) {
            if (body.points.length === 0 || body.points.length > MAX_DISCOVERY_BATCH) {
              return res.status(400).json({ error: 'Invalid points batch' })
            }
            for (const point of body.points) {
              const parsed = parseCoordinate(
                (point as { lat?: unknown })?.lat,
                (point as { lng?: unknown })?.lng,
              )
              if (!parsed) {
                return res.status(400).json({ error: 'Invalid coordinates' })
              }
              incoming.push(parsed)
            }
          } else {
            const parsed = parseCoordinate(body.lat, body.lng)
            if (!parsed) {
              return res.status(400).json({ error: 'Invalid coordinates' })
            }
            incoming = [parsed]
          }

          // Migrate legacy {lat,lng}[] data to cell-ID string[] on first write.
          const cells = migrateDiscoveredAreas(team.discoveredAreas)
          let changed = false
          let limitReached = false

          for (const { lat, lng } of incoming) {
            if (cells.length >= MAX_DISCOVERY_CELLS) {
              limitReached = true
              break
            }
            const newCell = latLngToCell(lat, lng)
            if (!cells.includes(newCell)) {
              cells.push(newCell)
              changed = true
            }
          }

          if (changed) {
            await req.payload.update({
              collection: 'city-challenge-teams',
              id: teamId,
              data: { discoveredAreas: cells },
              depth: 0,
            })
          }

          return res.status(200).json({ discoveredAreas: cells, added: changed, limitReached })
        } catch (err: unknown) {
          req.payload.logger.error(err as Error)
          return res.status(500).json({ error: 'Internal server error' })
        }
      },
    },
    {
      path: '/:id/complete',
      method: 'post',
      handler: async (req: PayloadRequest, res) => {
        try {
          const userId = req.user?.id
          if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
          }

          const teamId = req.params.id
          const team = await findTeam(req.payload, teamId)
          if (!team) {
            return res.status(404).json({ error: 'Team not found' })
          }

          if (!isTeamLead(team, userId)) {
            return res
              .status(403)
              .json({ error: 'Only the team lead can mark challenges complete' })
          }

          const { locationId } = (req.body ?? {}) as { locationId?: unknown }
          if (!locationId || typeof locationId !== 'string') {
            return res.status(400).json({ error: 'Missing locationId' })
          }

          // Guard against dangling relationship IDs.
          try {
            await req.payload.findByID({
              collection: 'city-challenge-locations',
              id: locationId,
              depth: 0,
            })
          } catch {
            return res.status(400).json({ error: 'Unknown challenge' })
          }

          const current: string[] = Array.isArray(team.completedChallenges)
            ? [
                ...new Set(
                  (team.completedChallenges as Array<string | { id: string }>).map(relationshipId),
                ),
              ].filter(Boolean)
            : []

          const updated = current.includes(locationId)
            ? current.filter(id => id !== locationId)
            : [...current, locationId]

          await req.payload.update({
            collection: 'city-challenge-teams',
            id: teamId,
            data: { completedChallenges: updated },
            depth: 0,
          })

          return res.status(200).json({ completedChallenges: updated })
        } catch (err: unknown) {
          req.payload.logger.error(err as Error)
          return res.status(500).json({ error: 'Internal server error' })
        }
      },
    },
    {
      path: '/:id/members',
      method: 'post',
      handler: async (req: PayloadRequest, res) => {
        try {
          const userId = req.user?.id
          if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
          }

          const teamId = req.params.id
          const team = await findTeam(req.payload, teamId)
          if (!team) {
            return res.status(404).json({ error: 'Team not found' })
          }

          if (!isTeamLead(team, userId)) {
            return res.status(403).json({ error: 'Only the team lead can manage members' })
          }

          const body = (req.body ?? {}) as {
            action?: unknown
            username?: unknown
            userId?: unknown
          }
          const action = typeof body.action === 'string' ? body.action : ''
          const requestedUserId =
            typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : undefined
          const requestedUsername =
            typeof body.username === 'string' && body.username.trim()
              ? body.username.trim()
              : undefined

          if (action !== 'add' && action !== 'remove') {
            return res.status(400).json({ error: 'Action must be "add" or "remove"' })
          }
          if (!requestedUserId && !requestedUsername) {
            return res.status(400).json({ error: 'Missing userId or username' })
          }

          const target = await findUserByHandle(req.payload, {
            userId: requestedUserId,
            username: requestedUsername,
          })
          if (!target) {
            return res.status(404).json({ error: 'User not found' })
          }

          if (target.id === teamLeadId(team)) {
            return res.status(400).json({ error: 'That user is already the team lead' })
          }

          const currentMembers = memberIds(team)

          if (action === 'add') {
            if (currentMembers.includes(target.id)) {
              return res.status(200).json(await buildRoster(req.payload, team))
            }

            const conflict = await findConflictingTeam(req.payload, target.id, teamId)
            if (conflict) {
              return res.status(409).json({ error: 'That user is already on another team' })
            }

            await req.payload.update({
              collection: 'city-challenge-teams',
              id: teamId,
              data: { members: [...currentMembers, target.id] },
              depth: 0,
            })
          } else {
            await req.payload.update({
              collection: 'city-challenge-teams',
              id: teamId,
              data: { members: currentMembers.filter(id => id !== target.id) },
              depth: 0,
            })
          }

          const updated = await findTeam(req.payload, teamId)
          return res.status(200).json(updated ? await buildRoster(req.payload, updated) : {})
        } catch (err: unknown) {
          req.payload.logger.error(err as Error)
          return res.status(500).json({ error: 'Internal server error' })
        }
      },
    },
    {
      path: '/:id/roster',
      method: 'get',
      handler: async (req: PayloadRequest, res) => {
        try {
          const userId = req.user?.id
          if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
          }

          const team = await findTeam(req.payload, req.params.id)
          if (!team) {
            return res.status(404).json({ error: 'Team not found' })
          }

          if (!isTeamMember(team, userId) && !isAdmin(req.user as User)) {
            return res.status(403).json({ error: 'You are not a member of this team' })
          }

          return res.status(200).json(await buildRoster(req.payload, team))
        } catch (err: unknown) {
          req.payload.logger.error(err as Error)
          return res.status(500).json({ error: 'Internal server error' })
        }
      },
    },
    {
      path: '/:id/member-search',
      method: 'get',
      handler: async (req: PayloadRequest, res) => {
        try {
          const userId = req.user?.id
          if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
          }

          const teamId = req.params.id
          const team = await findTeam(req.payload, teamId)
          if (!team) {
            return res.status(404).json({ error: 'Team not found' })
          }

          if (!isTeamLead(team, userId) && !isAdmin(req.user as User)) {
            return res.status(403).json({ error: 'Only the team lead can search for members' })
          }

          const rawQuery = req.query?.q
          const query = typeof rawQuery === 'string' ? rawQuery.trim() : ''
          if (query.length < 2) {
            return res.status(200).json({ results: [] })
          }

          const found = await req.payload.find({
            collection: 'users',
            where: {
              or: [{ name: { like: query } }, { username: { like: query } }],
            },
            limit: 8,
            depth: 0,
            overrideAccess: true,
          })

          const excluded = await committedUserIds(req.payload, teamId)
          excluded.add(teamLeadId(team))

          const results = (found.docs as User[]).map(doc => {
            const unavailable = excluded.has(doc.id)
            return {
              id: doc.id,
              name: doc.name ?? null,
              username: doc.username ?? null,
              available: !unavailable,
              reason: unavailable ? 'Already on another team' : undefined,
            }
          })

          return res.status(200).json({ results })
        } catch (err: unknown) {
          req.payload.logger.error(err as Error)
          return res.status(500).json({ error: 'Internal server error' })
        }
      },
    },
  ],
}

export default CityChallengeTeams
