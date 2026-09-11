import React from 'react'
import { Metadata } from 'next'
import nextDynamic from 'next/dynamic'

import type { CityChallengeLocation, CityChallengeTeam, User } from '../../../payload/payload-types'
import { getMeUser } from '../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'
import { ChallengeList } from './ChallengeList'
import { NoTeamMessage } from './NoTeamMessage'
import { TeamPanel } from './TeamPanel'
import { TeamRoster } from './TeamRoster'

import wrapperClasses from '../../_components/Jumpstart/pageWrapper.module.scss'

const CityChallengeViewToggle = nextDynamic(
  () => import('./ViewToggle').then(mod => mod.CityChallengeViewToggle),
  { ssr: false },
)

const CityChallengeMap = nextDynamic(
  () => import('./CityChallengeMap').then(mod => mod.CityChallengeMap),
  { ssr: false },
)

type TeamRole = 'lead' | 'participant' | 'none'

// Geographic cell size — must match CityChallengeTeams.ts and CityChallengeMap/index.tsx.
const CELL_DEG = 0.001

interface ResolvedTeam {
  id: string
  name: string
  /** ID of the team lead (used for auth checks) */
  teamLeadId: string
  /** Display data for the lead — safe identity fields only */
  teamLead: { id: string; name?: string | null; username?: string | null }
  members: { id: string; name?: string | null; username?: string | null }[]
  completedChallenges: string[]
  /** Discovered geographic cell IDs in the form "latIdx:lngIdx". */
  discoveredAreas: string[]
}

function resolveTeam(team: CityChallengeTeam): ResolvedTeam {
  const leadUser =
    typeof team.teamLead === 'object' && team.teamLead !== null ? (team.teamLead as User) : null
  const leadId = leadUser ? leadUser.id : (team.teamLead as string)

  const members = (team.members || []).map(m => {
    if (typeof m === 'object' && m !== null) {
      const u = m as User
      return { id: u.id, name: u.name, username: u.username }
    }
    return { id: m as string, name: null, username: null }
  })

  const completedChallenges = (team.completedChallenges || []).map(c => {
    if (typeof c === 'object' && c !== null) return (c as CityChallengeLocation).id
    return c as string
  })

  // Normalize discoveredAreas to cell IDs, migrating legacy {lat,lng}[] data if present.
  const rawAreas = Array.isArray(team.discoveredAreas) ? team.discoveredAreas : []
  const discoveredAreas: string[] = (() => {
    if (rawAreas.length === 0) return []
    if (typeof rawAreas[0] === 'string') return rawAreas as string[]
    // Legacy format: array of {lat, lng} point objects — convert to cell IDs client-side.
    const cells = (rawAreas as { lat?: unknown; lng?: unknown }[])
      .filter(
        (p): p is { lat: number; lng: number } =>
          typeof p.lat === 'number' && typeof p.lng === 'number',
      )
      .map(p => `${Math.floor(p.lat / CELL_DEG)}:${Math.floor(p.lng / CELL_DEG)}`)
    return [...new Set(cells)]
  })()

  return {
    id: team.id,
    name: team.name,
    teamLeadId: leadId,
    teamLead: {
      id: leadId,
      name: leadUser?.name ?? null,
      username: leadUser?.username ?? null,
    },
    members,
    completedChallenges,
    discoveredAreas,
  }
}

export default async function CityChallengePage({
  searchParams,
}: {
  searchParams: { view?: string }
}) {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to access the City Challenge.',
    )}&redirect=${encodeURIComponent('/citychallenge')}`,
  })

  const isAdmin = user?.roles?.includes('admin') ?? false
  const currentView = searchParams?.view || 'list'

  let locations: CityChallengeLocation[] = []
  let team: ResolvedTeam | null = null
  let role: TeamRole = 'none'

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-locations?limit=100&sort=sortOrder`,
      { headers: { Authorization: `JWT ${token}` } },
    )
    if (res.ok) {
      const json = await res.json()
      locations = (json as { docs: CityChallengeLocation[] }).docs ?? []
    }
  } catch {
    // silent
  }

  try {
    // Find team where user is lead
    const leadRes = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams?where[teamLead][equals]=${user.id}&depth=1&limit=1`,
      { headers: { Authorization: `JWT ${token}` } },
    )
    if (leadRes.ok) {
      const json = await leadRes.json()
      const docs = (json as { docs: CityChallengeTeam[] }).docs ?? []
      if (docs.length > 0) {
        team = resolveTeam(docs[0])
        role = 'lead'
      }
    }

    // If not a lead, check if user is a member
    if (!team) {
      const memberRes = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams?where[members][contains]=${user.id}&depth=1&limit=1`,
        { headers: { Authorization: `JWT ${token}` } },
      )
      if (memberRes.ok) {
        const json = await memberRes.json()
        const docs = (json as { docs: CityChallengeTeam[] }).docs ?? []
        if (docs.length > 0) {
          team = resolveTeam(docs[0])
          role = 'participant'
        }
      }
    }
  } catch {
    // silent
  }

  return (
    <div className={wrapperClasses.page}>
      {role === 'none' ? (
        <NoTeamMessage />
      ) : (
        <div>
          {role === 'lead' && team && (
            <TeamPanel teamId={team.id} teamName={team.name} members={team.members} token={token} />
          )}

          <CityChallengeViewToggle />

          {currentView === 'list' && team ? (
            <ChallengeList
              locations={locations}
              completedChallenges={team.completedChallenges}
              isLead={role === 'lead'}
              teamId={team.id}
              token={token}
            />
          ) : (
            team && (
              <CityChallengeMap
                locations={locations}
                isAdmin={isAdmin}
                teamId={team.id}
                token={token}
                discoveredAreas={team.discoveredAreas}
                completedChallenges={team.completedChallenges}
              />
            )
          )}

          {team && (
            <TeamRoster teamName={team.name} teamLead={team.teamLead} members={team.members} />
          )}
        </div>
      )}
    </div>
  )
}

export const metadata: Metadata = {
  title: 'City Challenge',
  description: 'Discover hidden locations around Southampton in our scavenger hunt.',
  openGraph: mergeOpenGraph({
    title: 'City Challenge',
    url: '/citychallenge',
  }),
}
