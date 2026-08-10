import React from 'react'
import { Metadata } from 'next'
import nextDynamic from 'next/dynamic'

import type { CityChallengeLocation, CityChallengeTeam, User } from '../../../payload/payload-types'
import { getMeUser } from '../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'

import wrapperClasses from '../../_components/Jumpstart/pageWrapper.module.scss'
import { NoTeamMessage } from './NoTeamMessage'
import { ChallengeList } from './ChallengeList'
import { TeamPanel } from './TeamPanel'

const CityChallengeViewToggle = nextDynamic(
  () => import('./ViewToggle').then(mod => mod.CityChallengeViewToggle),
  { ssr: false },
)

const CityChallengeMap = nextDynamic(
  () => import('./CityChallengeMap').then(mod => mod.CityChallengeMap),
  { ssr: false },
)

type TeamRole = 'lead' | 'participant' | 'none'

interface ResolvedTeam {
  id: string
  name: string
  teamLead: string
  members: { id: string; name?: string | null; username?: string | null }[]
  completedChallenges: string[]
  discoveredAreas: { lat: number; lng: number }[]
}

function resolveTeam(team: CityChallengeTeam): ResolvedTeam {
  const leadId =
    typeof team.teamLead === 'object' && team.teamLead !== null
      ? (team.teamLead as User).id
      : (team.teamLead as string)

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

  const discoveredAreas = Array.isArray(team.discoveredAreas) ? team.discoveredAreas : []

  return {
    id: team.id,
    name: team.name,
    teamLead: leadId,
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
