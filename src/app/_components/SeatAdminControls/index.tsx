'use client'

import React from 'react'

import type { TableMember } from '../../_api/fetchBooking'

import classes from './index.module.scss'

type SeatAdminControlsProps = {
  members: TableMember[]
  locked: boolean
  /** Admin actions manage the table without the admin joining it. */
  onRemoveMember: (member: TableMember) => void
  onToggleLock: () => void
  onDeleteTable: () => void
  removingMemberId?: string | null
  busyAction?: 'lock' | 'delete' | null
}

/**
 * Presentational admin controls for the seat plan: remove a guest, lock/unlock the
 * table, or delete it. Confirmations and API calls live in `SeatPage`.
 */
export const SeatAdminControls: React.FC<SeatAdminControlsProps> = ({
  members,
  locked,
  onRemoveMember,
  onToggleLock,
  onDeleteTable,
  removingMemberId,
  busyAction,
}) => {
  const busy = Boolean(busyAction) || Boolean(removingMemberId)

  return (
    <section className={classes.panel} aria-label="Admin controls">
      <div className={classes.header}>
        <h3 className={classes.title}>Admin controls</h3>
        <span className={classes.hint}>Manage this table without joining it.</span>
      </div>

      <p className={classes.label}>Members</p>
      {members.length === 0 ? (
        <p className={classes.empty}>No members at this table.</p>
      ) : (
        <ul className={classes.members}>
          {members.map(member => (
            <li key={member.id} className={classes.memberRow}>
              <span className={classes.memberName}>
                {member.name}
                {member.plusOneCount > 0
                  ? ` · ${member.plusOneCount} plus-one${member.plusOneCount === 1 ? '' : 's'}`
                  : ''}
              </span>
              <button
                type="button"
                className={classes.remove}
                onClick={() => onRemoveMember(member)}
                disabled={busy}
              >
                {removingMemberId === member.id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={classes.actions}>
        <button type="button" className={classes.secondary} onClick={onToggleLock} disabled={busy}>
          {busyAction === 'lock' ? 'Saving…' : locked ? 'Unlock table' : 'Lock table'}
        </button>
        <button type="button" className={classes.danger} onClick={onDeleteTable} disabled={busy}>
          {busyAction === 'delete' ? 'Deleting…' : 'Delete table'}
        </button>
      </div>
    </section>
  )
}
