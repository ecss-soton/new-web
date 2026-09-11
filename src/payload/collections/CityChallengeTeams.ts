import type { CollectionConfig, PayloadRequest } from 'payload/types'

import { admins } from '../access/admins'
import { user } from '../access/user'
import type { CityChallengeTeam } from '../payload-types'

// Geographic grid cell size in degrees. Must match the constant in CityChallengeMap/index.tsx.
// At Southampton (~51°N): ≈111 m per degree latitude, ≈70 m per degree longitude.
const CELL_DEG = 0.001

function latLngToCell(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL_DEG)}:${Math.floor(lng / CELL_DEG)}`
}

/**
 * Returns a deduplicated array of cell-ID strings from whatever is stored in
 * discoveredAreas, migrating the legacy {lat,lng}[] format on first access.
 */
function migrateDiscoveredAreas(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  if (typeof raw[0] === 'string') return raw as string[]
  // Legacy format: array of {lat, lng} point objects.
  const cells = (raw as { lat?: unknown; lng?: unknown }[])
    .filter(
      (p): p is { lat: number; lng: number } =>
        typeof p.lat === 'number' && typeof p.lng === 'number',
    )
    .map(p => latLngToCell(p.lat, p.lng))
  return [...new Set(cells)]
}

function isTeamMember(team: CityChallengeTeam, userId: string): boolean {
  const leadId =
    typeof team.teamLead === 'object' && team.teamLead !== null
      ? (team.teamLead as { id: string }).id
      : (team.teamLead as string)

  if (leadId === userId) return true

  const members = team.members as Array<string | { id: string }> | undefined
  if (!members) return false

  return members.some(m => {
    const id = typeof m === 'object' && m !== null ? m.id : m
    return id === userId
  })
}

function isTeamLead(team: CityChallengeTeam, userId: string): boolean {
  const leadId =
    typeof team.teamLead === 'object' && team.teamLead !== null
      ? (team.teamLead as { id: string }).id
      : (team.teamLead as string)

  return leadId === userId
}

const CityChallengeTeams: CollectionConfig = {
  slug: 'city-challenge-teams',
  access: {
    read: user,
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
          'Array of {lat, lng} points representing revealed fog-of-war areas. Managed via the discover endpoint.',
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
          const team = await req.payload.findByID({
            collection: 'city-challenge-teams',
            id: teamId,
            depth: 0,
          })

          if (!team) {
            return res.status(404).json({ error: 'Team not found' })
          }

          if (!isTeamMember(team, userId)) {
            return res.status(403).json({ error: 'You are not a member of this team' })
          }

          const { lat, lng } = req.body || {}
          if (
            typeof lat !== 'number' ||
            typeof lng !== 'number' ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
          ) {
            return res.status(400).json({ error: 'Invalid coordinates' })
          }

          // Migrate legacy {lat,lng}[] data to cell-ID string[] on first write.
          const cells = migrateDiscoveredAreas(team.discoveredAreas)
          const newCell = latLngToCell(lat, lng)

          if (cells.includes(newCell)) {
            return res.status(200).json({ discoveredAreas: cells, added: false })
          }

          const updated = [...cells, newCell]

          await req.payload.update({
            collection: 'city-challenge-teams',
            id: teamId,
            data: { discoveredAreas: updated },
            depth: 0,
          })

          return res.status(200).json({ discoveredAreas: updated, added: true })
        } catch (err: unknown) {
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
          const team = await req.payload.findByID({
            collection: 'city-challenge-teams',
            id: teamId,
            depth: 0,
          })

          if (!team) {
            return res.status(404).json({ error: 'Team not found' })
          }

          if (!isTeamLead(team, userId)) {
            return res
              .status(403)
              .json({ error: 'Only the team lead can mark challenges complete' })
          }

          const { locationId } = req.body || {}
          if (!locationId || typeof locationId !== 'string') {
            return res.status(400).json({ error: 'Missing locationId' })
          }

          const raw = team.completedChallenges as Array<string | { id: string }>
          const current: string[] = Array.isArray(raw)
            ? raw.map(c => (typeof c === 'object' ? c.id : c))
            : []

          let updated: string[]
          if (current.includes(locationId)) {
            updated = current.filter(id => id !== locationId)
          } else {
            updated = [...current, locationId]
          }

          await req.payload.update({
            collection: 'city-challenge-teams',
            id: teamId,
            data: { completedChallenges: updated },
            depth: 0,
          })

          return res.status(200).json({ completedChallenges: updated })
        } catch (err: unknown) {
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
          const team = await req.payload.findByID({
            collection: 'city-challenge-teams',
            id: teamId,
            depth: 0,
          })

          if (!team) {
            return res.status(404).json({ error: 'Team not found' })
          }

          if (!isTeamLead(team, userId)) {
            return res.status(403).json({ error: 'Only the team lead can manage members' })
          }

          const { action, username } = req.body || {}
          if (!action || !username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Missing action or username' })
          }

          if (action !== 'add' && action !== 'remove') {
            return res.status(400).json({ error: 'Action must be "add" or "remove"' })
          }

          const currentMembers: string[] = Array.isArray(team.members)
            ? team.members.map((m: string | { id: string }) => (typeof m === 'object' ? m.id : m))
            : []

          if (action === 'add') {
            const userResult = await req.payload.find({
              collection: 'users',
              where: { username: { equals: username } },
              limit: 1,
              depth: 0,
            })

            if (!userResult.docs.length) {
              return res.status(404).json({ error: `User "${username}" not found` })
            }

            const targetUserId = userResult.docs[0].id
            if (currentMembers.includes(targetUserId)) {
              return res.status(200).json({ members: currentMembers, message: 'Already a member' })
            }

            const updated = [...currentMembers, targetUserId]
            await req.payload.update({
              collection: 'city-challenge-teams',
              id: teamId,
              data: { members: updated },
              depth: 0,
            })

            return res.status(200).json({ members: updated })
          }

          // action === 'remove'
          const userResult = await req.payload.find({
            collection: 'users',
            where: { username: { equals: username } },
            limit: 1,
            depth: 0,
          })

          if (!userResult.docs.length) {
            return res.status(404).json({ error: `User "${username}" not found` })
          }

          const targetUserId = userResult.docs[0].id
          const updated = currentMembers.filter(id => id !== targetUserId)

          await req.payload.update({
            collection: 'city-challenge-teams',
            id: teamId,
            data: { members: updated },
            depth: 0,
          })

          return res.status(200).json({ members: updated })
        } catch (err: unknown) {
          return res.status(500).json({ error: 'Internal server error' })
        }
      },
    },
  ],
}

export default CityChallengeTeams
