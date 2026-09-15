import React from 'react'

import classes from './index.module.scss'

type Member = { id: string; name?: string | null; username?: string | null }

type Props = {
  teamName: string
  teamLead: Member
  members: Member[]
}

function displayMember(m: Member): string {
  return m.name || m.username || 'Unknown member'
}

export const TeamRoster: React.FC<Props> = ({ teamName, teamLead, members }) => {
  const allMembers: (Member & { isLead: boolean })[] = [
    { ...teamLead, isLead: true },
    ...members.map(m => ({ ...m, isLead: false })),
  ]

  return (
    <div className={classes.roster}>
      <h3 className={classes.rosterTitle}>Team: {teamName}</h3>
      <ul className={classes.rosterList}>
        {allMembers.map(member => (
          <li key={member.id} className={classes.rosterItem}>
            <span className={classes.rosterName}>{displayMember(member)}</span>
            {member.isLead && <span className={classes.leadBadge}>Team Lead</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
