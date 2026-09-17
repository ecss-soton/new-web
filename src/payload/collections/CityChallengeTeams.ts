import { APIError } from 'payload/errors'
import type { CollectionConfig, PayloadRequest } from 'payload/types'

import {
  isTeamLead,
  isTeamMember,
  latLngToCell,
  MAX_DISCOVERY_BATCH,
  MAX_DISCOVERY_CELLS,
  memberIds,
  migrateChallengeProgress,
  migrateDiscoveredAreas,
  parseCoordinate,
  relationshipId,
  teamLeadId,
} from '../../app/_utilities/cityChallenge'
import { admins } from '../access/admins'
import { isAdmin } from '../access/isAdmin'
import type { CityChallengeLocation, CityChallengeTeam, User } from '../payload-types'
import Groups from './groups'

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

/**
 * Prevents a user from leading or joining more than one team. Only runs when the
 * roster actually changes, so frequent discovery/completion writes skip it.
 * Covers admin/CMS edits as well as API calls.
 */
async function validateUniqueRoster({
  data,
  originalDoc,
  operation,
  req,
}: {
  data: Record<string, unknown>
  originalDoc?: Record<string, unknown>
  operation: 'create' | 'update'
  req: PayloadRequest
}): Promise<Record<string, unknown>> {
  const touchesRoster = operation === 'create' || 'teamLead' in data || 'members' in data
  if (!touchesRoster) return data

  const effectiveLead = 'teamLead' in data ? data.teamLead : originalDoc?.teamLead
  const effectiveMembers = 'members' in data ? data.members : originalDoc?.members

  const leadId = teamLeadId({ teamLead: effectiveLead })
  const members = memberIds({ members: effectiveMembers })

  if (leadId && members.includes(leadId)) {
    throw new APIError('The team lead cannot also be listed as a team member.', 400)
  }

  const rosterIds = [leadId, ...members].filter(Boolean)
  if (rosterIds.length === 0) return data

  const originalId = typeof originalDoc?.id === 'string' ? originalDoc.id : undefined
  const otherTeams = await req.payload.find({
    collection: 'city-challenge-teams',
    where: originalId ? { id: { not_equals: originalId } } : undefined,
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const used = new Set<string>()
  for (const team of otherTeams.docs as CityChallengeTeam[]) {
    const otherLead = teamLeadId(team)
    if (otherLead) used.add(otherLead)
    for (const id of memberIds(team)) used.add(id)
  }

  if (rosterIds.some(id => used.has(id))) {
    throw new APIError('One or more selected users are already on another team.', 400)
  }

  return data
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
  hooks: {
    beforeChange: [validateUniqueRoster],
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'teamLead', 'members', 'updatedAt'],
    group: Groups.CityChallenge,
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
      name: 'challengeProgress',
      type: 'json',
      label: 'Challenge Progress',
      admin: {
        readOnly: true,
        description:
          'Array of { locationId, count } entries tracking counter challenge progress. Managed via the complete endpoint.',
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

          if (!isTeamLead(team, userId) && !isAdmin(req.user as User)) {
            return res
              .status(403)
              .json({ error: 'Only the team lead or an admin can update challenges' })
          }

          const body = (req.body ?? {}) as { locationId?: unknown; count?: unknown }
          const { locationId } = body
          if (!locationId || typeof locationId !== 'string') {
            return res.status(400).json({ error: 'Missing locationId' })
          }

          // Guard against dangling relationship IDs and read the completion type.
          let location: CityChallengeLocation
          try {
            location = (await req.payload.findByID({
              collection: 'city-challenge-locations',
              id: locationId,
              depth: 0,
            })) as CityChallengeLocation
          } catch {
            return res.status(400).json({ error: 'Unknown challenge' })
          }

          let completedChallenges: string[] = Array.isArray(team.completedChallenges)
            ? [
                ...new Set(
                  (team.completedChallenges as Array<string | { id: string }>).map(relationshipId),
                ),
              ].filter(Boolean)
            : []
          let challengeProgress = migrateChallengeProgress(team.challengeProgress)

          if (location.completionType === 'counter') {
            const maxCount =
              typeof location.maxCount === 'number' &&
              Number.isInteger(location.maxCount) &&
              location.maxCount > 0
                ? location.maxCount
                : 0
            if (maxCount < 1) {
              return res.status(400).json({ error: 'This challenge has no maximum count set' })
            }
            if (typeof body.count !== 'number' || !Number.isInteger(body.count) || body.count < 0) {
              return res.status(400).json({ error: 'count must be a whole number of 0 or more' })
            }

            const clamped = Math.min(body.count, maxCount)
            challengeProgress = challengeProgress.filter(entry => entry.locationId !== locationId)
            if (clamped > 0) {
              challengeProgress.push({ locationId, count: clamped })
            }
          } else {
            completedChallenges = completedChallenges.includes(locationId)
              ? completedChallenges.filter(id => id !== locationId)
              : [...completedChallenges, locationId]
          }

          await req.payload.update({
            collection: 'city-challenge-teams',
            id: teamId,
            data: { completedChallenges, challengeProgress },
            depth: 0,
          })

          return res.status(200).json({ completedChallenges, challengeProgress })
        } catch (err: unknown) {
          req.payload.logger.error(err as Error)
          return res.status(500).json({ error: 'Internal server error' })
        }
      },
    },
    {
      path: '/:id/name',
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

          if (!isTeamLead(team, userId) && !isAdmin(req.user as User)) {
            return res
              .status(403)
              .json({ error: 'Only the team lead or an admin can rename the team' })
          }

          const { name } = (req.body ?? {}) as { name?: unknown }
          if (typeof name !== 'string') {
            return res.status(400).json({ error: 'Missing name' })
          }

          const trimmed = name.trim().replace(/\s+/g, ' ')
          if (trimmed.length < 1 || trimmed.length > 60) {
            return res.status(400).json({ error: 'Team name must be between 1 and 60 characters' })
          }

          await req.payload.update({
            collection: 'city-challenge-teams',
            id: teamId,
            data: { name: trimmed },
            depth: 0,
          })

          return res.status(200).json({ name: trimmed })
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
