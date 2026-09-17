import type { PayloadHandler } from 'payload/config'

import {
  getExploredPercentage,
  memberIds,
  migrateChallengeProgress,
  relationshipId,
} from '../../app/_utilities/cityChallenge'
import { isAdmin } from '../access/isAdmin'
import type { CityChallengeLocation, CityChallengeTeam, User } from '../payload-types'

interface UserSummary {
  id: string
  name: string | null
  username: string | null
}

interface TeamProgress {
  id: string
  name: string
  teamLead: UserSummary
  memberCount: number
  completedChallenges: string[]
  challengeProgress: Array<{ locationId: string; count: number }>
  exploredPercent: number
  lastUpdated: string
}

interface LocationSummary {
  id: string
  name: string
  zone: string | null
  completionType: 'tick' | 'counter'
  points: number
  maxCount: number | null
  sortOrder: number
}

/**
 * Admin-only aggregate of every team's City Challenge progress, plus the
 * challenge list. The admin UI derives both the team leaderboard and the
 * per-challenge breakdown from this single payload.
 */
export const cityChallengeProgress: PayloadHandler = async (req, res) => {
  if (!isAdmin(req.user as User)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const [teamsResult, locationsResult] = await Promise.all([
      req.payload.find({
        collection: 'city-challenge-teams',
        limit: 0,
        depth: 0,
        overrideAccess: true,
      }),
      req.payload.find({
        collection: 'city-challenge-locations',
        limit: 0,
        depth: 0,
        overrideAccess: true,
      }),
    ])

    const teams = teamsResult.docs as CityChallengeTeam[]
    const locations = locationsResult.docs as CityChallengeLocation[]

    // One batched user lookup for every lead/member across all teams.
    const userIds = [
      ...new Set(teams.flatMap(team => [relationshipId(team.teamLead), ...memberIds(team)])),
    ].filter(Boolean)

    const userMap = new Map<string, UserSummary>()
    if (userIds.length > 0) {
      const users = await req.payload.find({
        collection: 'users',
        where: { id: { in: userIds } },
        limit: 0,
        depth: 0,
        overrideAccess: true,
      })
      for (const user of users.docs as User[]) {
        userMap.set(user.id, {
          id: user.id,
          name: user.name ?? null,
          username: user.username ?? null,
        })
      }
    }

    const teamProgress: TeamProgress[] = teams.map(team => {
      const leadId = relationshipId(team.teamLead)
      return {
        id: team.id,
        name: team.name,
        teamLead: userMap.get(leadId) ?? { id: leadId, name: null, username: null },
        memberCount: memberIds(team).length,
        completedChallenges: (team.completedChallenges ?? []).map(relationshipId).filter(Boolean),
        challengeProgress: migrateChallengeProgress(team.challengeProgress),
        exploredPercent: getExploredPercentage(team.discoveredAreas),
        lastUpdated: team.updatedAt,
      }
    })

    const locationSummaries: LocationSummary[] = locations.map(location => ({
      id: location.id,
      name: location.name,
      zone: location.zone ?? null,
      completionType: location.completionType === 'counter' ? 'counter' : 'tick',
      points: typeof location.points === 'number' ? location.points : 0,
      maxCount: typeof location.maxCount === 'number' ? location.maxCount : null,
      sortOrder: location.sortOrder ?? 0,
    }))

    return res.status(200).json({ teams: teamProgress, locations: locationSummaries })
  } catch (err: unknown) {
    req.payload.logger.error(err as Error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
