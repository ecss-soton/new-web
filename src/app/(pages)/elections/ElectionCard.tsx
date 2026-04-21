'use client'

import React, { useState } from 'react'

import { Election, Position, User } from '../../../payload/payload-types'
import { Positions } from '../../_components/Positions'

import classes from './index.module.scss'

function formatDate(dateString: string) {
  const date = new Date(Date.parse(dateString))
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(date)
}

export const ElectionCard: React.FC<{
  election: Omit<Election, 'positions'> & { positions: Position[] }
  user: User
}> = ({ election, user }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const { id, name, nominationStart, nominationEnd, votingStart, votingEnd, positions } = election
  const now = new Date().getTime()
  const canCreateNomination = now >= Date.parse(nominationStart) && now <= Date.parse(nominationEnd)

  const status =
    now < Date.parse(nominationStart)
      ? 'Upcoming'
      : now <= Date.parse(nominationEnd)
      ? 'Nominations Open'
      : now < Date.parse(votingStart)
      ? 'Awaiting Voting'
      : now <= Date.parse(votingEnd)
      ? 'Voting Open'
      : 'Finished'

  return (
    <div className={classes.electionCard}>
      <div
        className={classes.electionHeader}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsExpanded(!isExpanded)
          }
        }}
      >
        <div className={classes.titleGroup}>
          <h2 className={classes.electionTitle}>
            {name}
            <span className={`${classes.chevron} ${isExpanded ? classes.expanded : ''}`}>▼</span>
          </h2>
          <span
            className={`${classes.statusBadge} ${classes[status.replace(' ', '').toLowerCase()]}`}
          >
            {status}
          </span>
        </div>
        <div className={classes.datesGrid}>
          <div className={classes.dateItem}>
            <strong>Nominations {now < Date.parse(nominationStart) ? 'Open' : 'Opened'}:</strong> {formatDate(nominationStart)}
          </div>
          <div className={classes.dateItem}>
            <strong>Nominations {now < Date.parse(nominationEnd) ? 'Close' : 'Closed'}:</strong> {formatDate(nominationEnd)}
          </div>
          <div className={classes.dateItem}>
            <strong>Voting {now < Date.parse(votingStart) ? 'Open' : 'Opened'}:</strong> {formatDate(votingStart)}
          </div>
          <div className={classes.dateItem}>
            <strong>Voting {now < Date.parse(votingEnd) ? 'Close' : 'Closed'}:</strong> {formatDate(votingEnd)}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className={classes.electionBody}>
          <Positions
            positions={positions}
            election={election}
            canCreateNominations={canCreateNomination}
            user={user}
          />
        </div>
      )}
    </div>
  )
}
