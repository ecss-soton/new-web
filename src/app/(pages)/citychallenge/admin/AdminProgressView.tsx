'use client'

import React, { Fragment, useId, useMemo, useState } from 'react'

import { getChallengeMaxCount, getChallengeMaxPoints } from '../../../_utilities/cityChallenge'
import {
  type AdminLocation,
  type AdminProgressData,
  type AdminTeam,
  type ChallengeBreakdown,
  challengeBreakdown,
  type PreparedTeam,
  prepareTeam,
  type TeamChallengeStatus,
  teamChallengeStatus,
  teamSummary,
} from '../../../_utilities/cityChallengeStats'
import { bungee } from '../../../_utilities/font'

import classes from './index.module.scss'

type Tab = 'teams' | 'challenges'
type Dir = 'asc' | 'desc'
type TeamSortKey = 'points' | 'completed' | 'explored' | 'members' | 'name' | 'updated'
type ChallengeSortKey =
  | 'completed'
  | 'notCompleted'
  | 'completionPct'
  | 'pointsAwarded'
  | 'points'
  | 'name'
  | 'sortOrder'
type ChallengeFilter = 'all' | 'incomplete' | 'complete' | 'untouched'

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toISOString().slice(0, 10)
}

function compareValues(a: number | string, b: number | string): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
}

const ChallengeControl: React.FC<{
  type: 'tick' | 'counter'
  status: TeamChallengeStatus
  disabled: boolean
  onToggle: () => void
  onCount: (count: number) => void
}> = ({ type, status, disabled, onToggle, onCount }) => {
  if (type === 'counter') {
    return (
      <span className={classes.control}>
        <button
          type="button"
          className={classes.controlButton}
          onClick={() => onCount(status.count - 1)}
          disabled={disabled || status.count <= 0}
          aria-label="Decrease progress"
        >
          −
        </button>
        <span className={classes.controlValue}>
          {status.count} / {status.maxCount}
        </span>
        <button
          type="button"
          className={classes.controlButton}
          onClick={() => onCount(status.count + 1)}
          disabled={disabled || status.count >= status.maxCount}
          aria-label="Increase progress"
        >
          +
        </button>
      </span>
    )
  }

  const complete = status.state === 'complete'
  return (
    <button
      type="button"
      className={[classes.controlToggle, complete ? classes.controlToggleOn : '']
        .filter(Boolean)
        .join(' ')}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={complete}
    >
      {complete ? 'Ticked' : 'Not ticked'}
    </button>
  )
}

const RenameTeamForm: React.FC<{
  name: string
  saving: boolean
  onRename: (name: string) => Promise<string | null>
}> = ({ name, saving, onRename }) => {
  const inputId = useId()
  const [value, setValue] = useState(name)
  const normalized = value.trim().replace(/\s+/g, ' ')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || !normalized || normalized === name) return
    const saved = await onRename(normalized)
    if (saved) setValue(saved)
  }

  return (
    <form className={classes.renameForm} onSubmit={submit}>
      <label className={classes.renameLabel} htmlFor={inputId}>
        Team name
      </label>
      <div className={classes.renameRow}>
        <input
          id={inputId}
          type="text"
          className={classes.renameInput}
          value={value}
          maxLength={60}
          disabled={saving}
          onChange={e => setValue(e.target.value)}
        />
        <button
          type="submit"
          className={classes.renameButton}
          disabled={saving || !normalized || normalized === name}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

const SortHeader: React.FC<{
  label: string
  active: boolean
  dir: Dir
  onClick: () => void
}> = ({ label, active, dir, onClick }) => (
  <th scope="col" aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
    <button
      type="button"
      className={[classes.thButton, active ? classes.thButtonActive : ''].join(' ')}
      onClick={onClick}
    >
      {label}
      <span className={classes.arrow} aria-hidden="true">
        {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  </th>
)

const TeamsTab: React.FC<{
  teams: PreparedTeam[]
  locations: AdminLocation[]
  onUpdate: (teamId: string, location: AdminLocation, count?: number) => void
  isPending: (teamId: string, locationId: string) => boolean
  onRename: (teamId: string, name: string) => Promise<string | null>
  isRenaming: (teamId: string) => boolean
}> = ({ teams, locations, onUpdate, isPending, onRename, isRenaming }) => {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<TeamSortKey>('points')
  const [dir, setDir] = useState<Dir>('desc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const handleSort = (key: TeamSortKey) => {
    if (key === sort) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSort(key)
      setDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const summarised = teams.map(prepared => ({
      prepared,
      summary: teamSummary(prepared, locations),
    }))
    const filtered = q
      ? summarised.filter(({ prepared }) => {
          const lead = prepared.team.teamLead
          const leadName = `${lead.name ?? ''} ${lead.username ?? ''}`.toLowerCase()
          return prepared.team.name.toLowerCase().includes(q) || leadName.includes(q)
        })
      : summarised

    return [...filtered].sort((a, b) => {
      const value = (item: typeof a): number | string => {
        const { prepared, summary } = item
        switch (sort) {
          case 'points':
            return summary.points
          case 'completed':
            return summary.completedCount
          case 'explored':
            return prepared.team.exploredPercent
          case 'members':
            return prepared.team.memberCount
          case 'updated':
            return new Date(prepared.team.lastUpdated).getTime() || 0
          case 'name':
          default:
            return prepared.team.name.toLowerCase()
        }
      }
      const cmp = compareValues(value(a), value(b))
      return dir === 'asc' ? cmp : -cmp
    })
  }, [teams, locations, query, sort, dir])

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div role="tabpanel">
      <div className={classes.toolbar}>
        <input
          type="search"
          className={classes.search}
          placeholder="Search teams or leads…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search teams"
        />
      </div>

      <div className={classes.tableWrap}>
        <table className={classes.table}>
          <thead>
            <tr>
              <th scope="col">#</th>
              <SortHeader
                label="Team"
                active={sort === 'name'}
                dir={dir}
                onClick={() => handleSort('name')}
              />
              <th scope="col">Lead</th>
              <SortHeader
                label="Members"
                active={sort === 'members'}
                dir={dir}
                onClick={() => handleSort('members')}
              />
              <SortHeader
                label="Completed"
                active={sort === 'completed'}
                dir={dir}
                onClick={() => handleSort('completed')}
              />
              <SortHeader
                label="Points"
                active={sort === 'points'}
                dir={dir}
                onClick={() => handleSort('points')}
              />
              <SortHeader
                label="Explored"
                active={sort === 'explored'}
                dir={dir}
                onClick={() => handleSort('explored')}
              />
              <SortHeader
                label="Updated"
                active={sort === 'updated'}
                dir={dir}
                onClick={() => handleSort('updated')}
              />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ prepared, summary }, index) => {
              const { team } = prepared
              const isOpen = expanded.has(team.id)
              return (
                <Fragment key={team.id}>
                  <tr>
                    <td className={classes.rank}>{index + 1}</td>
                    <td>
                      <button
                        type="button"
                        className={classes.expandButton}
                        aria-expanded={isOpen}
                        onClick={() => toggle(team.id)}
                      >
                        <span
                          className={[classes.chevron, isOpen ? classes.chevronOpen : ''].join(' ')}
                          aria-hidden="true"
                        >
                          ▶
                        </span>
                        <span className={classes.expandName}>{team.name}</span>
                      </button>
                      <a
                        className={classes.cmsLink}
                        href={`/admin/collections/city-challenge-teams/${team.id}`}
                      >
                        Open in CMS
                      </a>
                    </td>
                    <td>{team.teamLead.name ?? team.teamLead.username ?? '—'}</td>
                    <td className={classes.numeric}>{team.memberCount}</td>
                    <td className={classes.numeric}>
                      {summary.completedCount} / {summary.totalCount}
                    </td>
                    <td className={classes.numeric}>
                      {summary.points} / {summary.maxPoints}
                    </td>
                    <td className={classes.numeric}>{team.exploredPercent.toFixed(1)}%</td>
                    <td className={classes.numeric}>{formatDate(team.lastUpdated)}</td>
                  </tr>
                  {isOpen && (
                    <tr className={classes.detailRow}>
                      <td colSpan={8}>
                        <RenameTeamForm
                          name={team.name}
                          saving={isRenaming(team.id)}
                          onRename={name => onRename(team.id, name)}
                        />
                        {locations.length === 0 ? (
                          <p className={classes.detailEmpty}>No challenges configured.</p>
                        ) : (
                          <ul className={classes.detailList}>
                            {locations.map(location => (
                              <li key={location.id} className={classes.detailItem}>
                                <span className={classes.detailName}>{location.name}</span>
                                <ChallengeControl
                                  type={location.completionType}
                                  status={teamChallengeStatus(prepared, location)}
                                  disabled={isPending(team.id, location.id)}
                                  onToggle={() => onUpdate(team.id, location)}
                                  onCount={count => onUpdate(team.id, location, count)}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className={classes.empty}>No teams found.</p>}
    </div>
  )
}

const ChallengeGroups: React.FC<{
  location: AdminLocation
  breakdown: ChallengeBreakdown
  teamsById: Map<string, PreparedTeam>
  onUpdate: (teamId: string, location: AdminLocation, count?: number) => void
  isPending: (teamId: string, locationId: string) => boolean
}> = ({ location, breakdown, teamsById, onUpdate, isPending }) => {
  const groups: { title: string; items: TeamChallengeStatus[] }[] = [
    { title: 'Completed', items: breakdown.completed },
    { title: 'In progress', items: breakdown.inProgress },
    { title: 'Not started', items: breakdown.notStarted },
  ]

  return (
    <div className={classes.groups}>
      {groups.map(group => (
        <div key={group.title} className={classes.group}>
          <h4 className={classes.groupTitle}>
            {group.title} ({group.items.length})
          </h4>
          {group.items.length === 0 ? (
            <p className={classes.groupEmpty}>None</p>
          ) : (
            <ul className={classes.groupList}>
              {group.items.map(status => (
                <li key={status.teamId} className={classes.groupItem}>
                  <span className={classes.groupTeam}>
                    {teamsById.get(status.teamId)?.team.name ?? 'Unknown team'}
                  </span>
                  <ChallengeControl
                    type={location.completionType}
                    status={status}
                    disabled={isPending(status.teamId, location.id)}
                    onToggle={() => onUpdate(status.teamId, location)}
                    onCount={count => onUpdate(status.teamId, location, count)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

const ChallengesTab: React.FC<{
  locations: AdminLocation[]
  teams: PreparedTeam[]
  teamsById: Map<string, PreparedTeam>
  onUpdate: (teamId: string, location: AdminLocation, count?: number) => void
  isPending: (teamId: string, locationId: string) => boolean
}> = ({ locations, teams, teamsById, onUpdate, isPending }) => {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ChallengeFilter>('all')
  const [sort, setSort] = useState<ChallengeSortKey>('completed')
  const [dir, setDir] = useState<Dir>('desc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const handleSort = (key: ChallengeSortKey) => {
    if (key === sort) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSort(key)
      setDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const withBreakdown = locations.map(location => ({
      location,
      breakdown: challengeBreakdown(location, teams),
    }))

    const filtered = withBreakdown.filter(({ location, breakdown }) => {
      if (
        q &&
        !location.name.toLowerCase().includes(q) &&
        !(location.zone ?? '').toLowerCase().includes(q)
      ) {
        return false
      }
      switch (filter) {
        case 'incomplete':
          return breakdown.completedTeams < teams.length
        case 'complete':
          return teams.length > 0 && breakdown.completedTeams === teams.length
        case 'untouched':
          return breakdown.completedTeams === 0 && breakdown.inProgress.length === 0
        default:
          return true
      }
    })

    return [...filtered].sort((a, b) => {
      const value = (item: typeof a): number | string => {
        switch (sort) {
          case 'completed':
            return item.breakdown.completedTeams
          case 'notCompleted':
            return item.breakdown.notCompletedTeams
          case 'completionPct':
            return item.breakdown.completionPct
          case 'pointsAwarded':
            return item.breakdown.pointsAwarded
          case 'points':
            return getChallengeMaxPoints(item.location)
          case 'sortOrder':
            return item.location.sortOrder
          case 'name':
          default:
            return item.location.name.toLowerCase()
        }
      }
      const cmp = compareValues(value(a), value(b))
      return dir === 'asc' ? cmp : -cmp
    })
  }, [locations, teams, query, filter, sort, dir])

  // Challenges are grouped by zone (No Zone last), with the chosen sort applied
  // within each zone.
  const zoneGroups = useMemo(() => {
    const byZone = new Map<string, typeof rows>()
    for (const row of rows) {
      const zone = row.location.zone?.trim() || 'No Zone'
      const existing = byZone.get(zone)
      if (existing) existing.push(row)
      else byZone.set(zone, [row])
    }
    const zones = Array.from(byZone.keys()).sort((a, b) => {
      if (a === 'No Zone') return 1
      if (b === 'No Zone') return -1
      return a.localeCompare(b)
    })
    return zones.map(zone => ({ zone, rows: byZone.get(zone) ?? [] }))
  }, [rows])

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div role="tabpanel">
      <div className={classes.toolbar}>
        <input
          type="search"
          className={classes.search}
          placeholder="Search challenges or zones…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search challenges"
        />
        <label className={classes.filterLabel}>
          Show
          <select
            className={classes.select}
            value={filter}
            onChange={e => setFilter(e.target.value as ChallengeFilter)}
          >
            <option value="all">All challenges</option>
            <option value="incomplete">Incomplete by someone</option>
            <option value="complete">Completed by everyone</option>
            <option value="untouched">Untouched</option>
          </select>
        </label>
      </div>

      <div className={classes.tableWrap}>
        <table className={classes.table}>
          <thead>
            <tr>
              <th scope="col">#</th>
              <SortHeader
                label="Challenge"
                active={sort === 'name'}
                dir={dir}
                onClick={() => handleSort('name')}
              />
              <th scope="col">Type</th>
              <th scope="col">Points</th>
              <SortHeader
                label="Completed"
                active={sort === 'completed'}
                dir={dir}
                onClick={() => handleSort('completed')}
              />
              <SortHeader
                label="Not completed"
                active={sort === 'notCompleted'}
                dir={dir}
                onClick={() => handleSort('notCompleted')}
              />
              <SortHeader
                label="Done %"
                active={sort === 'completionPct'}
                dir={dir}
                onClick={() => handleSort('completionPct')}
              />
              <SortHeader
                label="Points awarded"
                active={sort === 'pointsAwarded'}
                dir={dir}
                onClick={() => handleSort('pointsAwarded')}
              />
            </tr>
          </thead>
          <tbody>
            {zoneGroups.map(({ zone, rows: zoneRows }) => (
              <Fragment key={zone}>
                <tr className={classes.zoneRow}>
                  <th className={classes.zoneHeader} colSpan={8} scope="colgroup">
                    {zone} <span className={classes.zoneCount}>({zoneRows.length})</span>
                  </th>
                </tr>
                {zoneRows.map(({ location, breakdown }, index) => {
                  const isOpen = expanded.has(location.id)
                  const pointsDisplay =
                    location.completionType === 'counter'
                      ? `${location.points} × ${getChallengeMaxCount(location)}`
                      : String(location.points)
                  return (
                    <Fragment key={location.id}>
                      <tr>
                        <td className={classes.rank}>{index + 1}</td>
                        <td>
                          <button
                            type="button"
                            className={classes.expandButton}
                            aria-expanded={isOpen}
                            onClick={() => toggle(location.id)}
                          >
                            <span
                              className={[classes.chevron, isOpen ? classes.chevronOpen : ''].join(
                                ' ',
                              )}
                              aria-hidden="true"
                            >
                              ▶
                            </span>
                            <span className={classes.expandName}>{location.name}</span>
                          </button>
                        </td>
                        <td>{location.completionType === 'counter' ? 'Counter' : 'Tick'}</td>
                        <td className={classes.numeric}>{pointsDisplay}</td>
                        <td className={classes.numeric}>{breakdown.completedTeams}</td>
                        <td className={classes.numeric}>{breakdown.notCompletedTeams}</td>
                        <td className={classes.numeric}>{breakdown.completionPct.toFixed(0)}%</td>
                        <td className={classes.numeric}>{breakdown.pointsAwarded}</td>
                      </tr>
                      {isOpen && (
                        <tr className={classes.detailRow}>
                          <td colSpan={8}>
                            {teams.length === 0 ? (
                              <p className={classes.detailEmpty}>No teams yet.</p>
                            ) : (
                              <ChallengeGroups
                                location={location}
                                breakdown={breakdown}
                                teamsById={teamsById}
                                onUpdate={onUpdate}
                                isPending={isPending}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className={classes.empty}>No challenges found.</p>}
    </div>
  )
}

export const AdminProgressView: React.FC<{ data: AdminProgressData; token: string }> = ({
  data,
  token,
}) => {
  const [tab, setTab] = useState<Tab>('teams')
  const [teams, setTeams] = useState<AdminTeam[]>(data.teams)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<Set<string>>(new Set())
  const [banner, setBanner] = useState<string | null>(null)

  const prepared = useMemo(() => teams.map(prepareTeam), [teams])
  const teamsById = useMemo(() => {
    const map = new Map<string, PreparedTeam>()
    prepared.forEach(team => map.set(team.team.id, team))
    return map
  }, [prepared])

  const isPending = (teamId: string, locationId: string) => pending.has(`${teamId}:${locationId}`)
  const isRenaming = (teamId: string) => renaming.has(teamId)

  const updateChallenge = async (teamId: string, location: AdminLocation, count?: number) => {
    const key = `${teamId}:${location.id}`
    if (pending.has(key)) return

    setPending(prev => new Set(prev).add(key))
    setBanner(null)

    try {
      const body =
        location.completionType === 'counter'
          ? { locationId: location.id, count: count ?? 0 }
          : { locationId: location.id }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams/${teamId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `JWT ${token}`,
          },
          body: JSON.stringify(body),
        },
      )

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setBanner(json.error || 'Failed to update challenge')
        return
      }

      const updatedTeam = (team: AdminTeam): AdminTeam => {
        if (team.id !== teamId) return team
        return {
          ...team,
          completedChallenges: Array.isArray(json.completedChallenges)
            ? json.completedChallenges
            : team.completedChallenges,
          challengeProgress: Array.isArray(json.challengeProgress)
            ? json.challengeProgress
            : team.challengeProgress,
        }
      }

      setTeams(prev => prev.map(updatedTeam))
    } catch {
      setBanner('Network error — please try again')
    } finally {
      setPending(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const renameTeam = async (teamId: string, name: string): Promise<string | null> => {
    if (renaming.has(teamId)) return null
    setRenaming(prev => new Set(prev).add(teamId))
    setBanner(null)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams/${teamId}/name`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `JWT ${token}`,
          },
          body: JSON.stringify({ name }),
        },
      )

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setBanner(json.error || 'Failed to rename team')
        return null
      }

      const saved = typeof json.name === 'string' ? json.name : name
      setTeams(prev => prev.map(t => (t.id === teamId ? { ...t, name: saved } : t)))
      return saved
    } catch {
      setBanner('Network error — please try again')
      return null
    } finally {
      setRenaming(prev => {
        const next = new Set(prev)
        next.delete(teamId)
        return next
      })
    }
  }

  return (
    <div className={classes.view}>
      {banner && (
        <p className={classes.error} role="alert">
          {banner}
        </p>
      )}

      <div className={classes.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'teams'}
          className={[classes.tab, bungee.className, tab === 'teams' ? classes.tabActive : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => setTab('teams')}
        >
          Teams ({data.teams.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'challenges'}
          className={[classes.tab, bungee.className, tab === 'challenges' ? classes.tabActive : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => setTab('challenges')}
        >
          Challenges ({data.locations.length})
        </button>
      </div>

      {tab === 'teams' ? (
        <TeamsTab
          teams={prepared}
          locations={data.locations}
          onUpdate={updateChallenge}
          isPending={isPending}
          onRename={renameTeam}
          isRenaming={isRenaming}
        />
      ) : (
        <ChallengesTab
          locations={data.locations}
          teams={prepared}
          teamsById={teamsById}
          onUpdate={updateChallenge}
          isPending={isPending}
        />
      )}
    </div>
  )
}
