import React from 'react'
import { Metadata } from 'next'

import type { CityChallengeLocation, CityChallengeTeam, User } from '../../../payload/payload-types'
import {
  getExploredPercentage,
  migrateDiscoveredAreas,
  relationshipId,
} from '../../_utilities/cityChallenge'
import { getMeUser } from '../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'
import { ChallengeList } from './ChallengeList'
import { CityChallengeMapLoader } from './CityChallengeMap/MapLoader'
import { NoTeamMessage } from './NoTeamMessage'
import { TeamPanel } from './TeamPanel'
import { TeamRoster } from './TeamRoster'
import { CityChallengeViewToggleLoader } from './ViewToggle/ViewToggleLoader'

import wrapperClasses from '../../_components/Jumpstart/pageWrapper.module.scss'
import classes from './page.module.scss'

type TeamRole = 'lead' | 'participant' | 'none'

interface MemberDisplay {
  id: string
  name?: string | null
  username?: string | null
}

interface RosterResponse {
  id: string
  name: string
  teamLead: MemberDisplay
  members: MemberDisplay[]
}

interface ResolvedTeam {
  id: string
  name: string
  /** ID of the team lead (used for auth checks) */
  teamLeadId: string
  /** Display data for the lead — safe identity fields only */
  teamLead: MemberDisplay
  members: MemberDisplay[]
  completedChallenges: string[]
  /** Discovered geographic cell IDs in the form "latIdx:lngIdx". */
  discoveredAreas: string[]
}

function resolveTeam(team: CityChallengeTeam, roster: RosterResponse | null): ResolvedTeam {
  const leadId = relationshipId(team.teamLead)
  const rawMembers = (team.members ?? []).map(relationshipId)

  const rosterMap = new Map<string, MemberDisplay>()
  if (roster) {
    rosterMap.set(roster.teamLead.id, roster.teamLead)
    roster.members.forEach(member => rosterMap.set(member.id, member))
  }
  const display = (id: string): MemberDisplay =>
    rosterMap.get(id) ?? { id, name: null, username: null }

  const completedChallenges = (team.completedChallenges ?? []).map(relationshipId)

  // Normalize discoveredAreas to cell IDs, migrating legacy {lat,lng}[] data if present.
  const discoveredAreas = migrateDiscoveredAreas(team.discoveredAreas)

  return {
    id: team.id,
    name: team.name,
    teamLeadId: leadId,
    teamLead: display(leadId),
    members: rawMembers.map(display),
    completedChallenges,
    discoveredAreas,
  }
}

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Authorization: `JWT ${token}` } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
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
  const currentView = searchParams?.view === 'map' ? 'map' : 'list'
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL

  let locations: CityChallengeLocation[] = []
  let locationsError: string | null = null
  let teamError: string | null = null
  let team: ResolvedTeam | null = null
  let role: TeamRole = 'none'

  const locationsJson = await fetchJson<{ docs: CityChallengeLocation[] }>(
    `${serverUrl}/api/city-challenge-locations?limit=0&sort=sortOrder`,
    token,
  )
  if (locationsJson) {
    locations = locationsJson.docs ?? []
  } else {
    locationsError = 'We could not load the challenges right now. Please try again later.'
  }

  // Find the team where the user is lead, then fall back to membership.
  const leadJson = await fetchJson<{ docs: CityChallengeTeam[] }>(
    `${serverUrl}/api/city-challenge-teams?where[teamLead][equals]=${user.id}&depth=0&limit=1`,
    token,
  )

  let memberJson: { docs: CityChallengeTeam[] } | null = null
  let teamLookupFailed = leadJson === null

  if (leadJson && leadJson.docs?.length === 0) {
    memberJson = await fetchJson<{ docs: CityChallengeTeam[] }>(
      `${serverUrl}/api/city-challenge-teams?where[members][contains]=${user.id}&depth=0&limit=1`,
      token,
    )
    if (memberJson === null) teamLookupFailed = true
  }

  const rawTeam = leadJson?.docs?.[0] ?? memberJson?.docs?.[0] ?? null

  if (teamLookupFailed) {
    teamError = 'We could not load your team right now. Please refresh the page.'
  } else if (rawTeam) {
    role = leadJson?.docs?.length ? 'lead' : 'participant'
    const roster = await fetchJson<RosterResponse>(
      `${serverUrl}/api/city-challenge-teams/${rawTeam.id}/roster`,
      token,
    )
    team = resolveTeam(rawTeam, roster)
  }

  return (
    <div className={wrapperClasses.page}>
      {(locationsError || teamError) && (
        <p className={classes.error} role="alert">
          {teamError ?? locationsError}
        </p>
      )}

      {teamError ? null : role === 'none' ? (
        <NoTeamMessage />
      ) : (
        <div>
          <CityChallengeViewToggleLoader />

          {currentView === 'list' && team ? (
            <ChallengeList
              locations={locations}
              completedChallenges={team.completedChallenges}
              isLead={role === 'lead'}
              teamId={team.id}
              token={token}
              error={locationsError}
              exploredPercent={getExploredPercentage(team.discoveredAreas)}
            />
          ) : (
            team && (
              <CityChallengeMapLoader
                locations={locations}
                isAdmin={isAdmin}
                teamId={team.id}
                token={token}
                discoveredAreas={team.discoveredAreas}
                completedChallenges={team.completedChallenges}
                error={locationsError}
              />
            )
          )}

          {team &&
            (role === 'lead' ? (
              <TeamPanel
                teamId={team.id}
                teamName={team.name}
                members={team.members}
                token={token}
              />
            ) : (
              <TeamRoster teamName={team.name} teamLead={team.teamLead} members={team.members} />
            ))}
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
