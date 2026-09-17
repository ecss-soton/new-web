// Client-safe derivations for the admin City Challenge progress view. Shares
// the scoring rules in ./cityChallenge so admin figures match the player UI.

import {
  getChallengeEarnedPoints,
  getChallengeMaxCount,
  getChallengeMaxPoints,
  isChallengeComplete,
} from './cityChallenge'

export interface AdminUserSummary {
  id: string
  name: string | null
  username: string | null
}

export interface AdminTeam {
  id: string
  name: string
  teamLead: AdminUserSummary
  memberCount: number
  completedChallenges: string[]
  challengeProgress: Array<{ locationId: string; count: number }>
  exploredPercent: number
  lastUpdated: string
}

export interface AdminLocation {
  id: string
  name: string
  zone: string | null
  completionType: 'tick' | 'counter'
  points: number
  maxCount: number | null
  sortOrder: number
}

export interface AdminProgressData {
  teams: AdminTeam[]
  locations: AdminLocation[]
}

export interface TeamSummary {
  completedCount: number
  totalCount: number
  points: number
  maxPoints: number
}

export type ChallengeState = 'complete' | 'in-progress' | 'not-started'

export interface TeamChallengeStatus {
  teamId: string
  state: ChallengeState
  count: number
  maxCount: number
  earnedPoints: number
}

export interface ChallengeBreakdown {
  completed: TeamChallengeStatus[]
  inProgress: TeamChallengeStatus[]
  notStarted: TeamChallengeStatus[]
  completedTeams: number
  notCompletedTeams: number
  completionPct: number
  pointsAwarded: number
}

export interface PreparedTeam {
  team: AdminTeam
  completed: Set<string>
  progress: Record<string, number>
}

export function progressMap(team: AdminTeam): Record<string, number> {
  const map: Record<string, number> = {}
  for (const entry of team.challengeProgress ?? []) {
    if (entry && typeof entry.locationId === 'string' && typeof entry.count === 'number') {
      map[entry.locationId] = entry.count
    }
  }
  return map
}

export function prepareTeam(team: AdminTeam): PreparedTeam {
  return {
    team,
    completed: new Set(team.completedChallenges ?? []),
    progress: progressMap(team),
  }
}

export function teamSummary(prepared: PreparedTeam, locations: AdminLocation[]): TeamSummary {
  let points = 0
  let maxPoints = 0
  let completedCount = 0
  for (const location of locations) {
    points += getChallengeEarnedPoints(location, prepared.completed, prepared.progress)
    maxPoints += getChallengeMaxPoints(location)
    if (isChallengeComplete(location, prepared.completed, prepared.progress)) completedCount++
  }
  return { completedCount, totalCount: locations.length, points, maxPoints }
}

export function teamChallengeStatus(
  prepared: PreparedTeam,
  location: AdminLocation,
): TeamChallengeStatus {
  const maxCount = getChallengeMaxCount(location)
  const rawCount = prepared.progress[location.id] ?? 0
  const count =
    location.completionType === 'counter'
      ? Math.max(0, Math.min(rawCount, maxCount))
      : prepared.completed.has(location.id)
      ? 1
      : 0
  const complete = isChallengeComplete(location, prepared.completed, prepared.progress)
  const state: ChallengeState = complete
    ? 'complete'
    : location.completionType === 'counter' && count > 0
    ? 'in-progress'
    : 'not-started'

  return {
    teamId: prepared.team.id,
    state,
    count,
    maxCount,
    earnedPoints: getChallengeEarnedPoints(location, prepared.completed, prepared.progress),
  }
}

export function challengeBreakdown(
  location: AdminLocation,
  teams: PreparedTeam[],
): ChallengeBreakdown {
  const completed: TeamChallengeStatus[] = []
  const inProgress: TeamChallengeStatus[] = []
  const notStarted: TeamChallengeStatus[] = []
  let pointsAwarded = 0

  for (const prepared of teams) {
    const status = teamChallengeStatus(prepared, location)
    pointsAwarded += status.earnedPoints
    if (status.state === 'complete') completed.push(status)
    else if (status.state === 'in-progress') inProgress.push(status)
    else notStarted.push(status)
  }

  const total = teams.length
  return {
    completed,
    inProgress,
    notStarted,
    completedTeams: completed.length,
    notCompletedTeams: total - completed.length,
    completionPct: total > 0 ? (completed.length / total) * 100 : 0,
    pointsAwarded,
  }
}
