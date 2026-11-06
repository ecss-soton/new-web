'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import {
  firstNameOf,
  plusOneSeatLabel,
  type TableNameMode,
} from '../../../utilities/booking/tableName'
import type { SeatAssignment, TableMember } from '../../_api/fetchBooking'

import classes from './index.module.scss'

export type SeatSlot = {
  userId: string | null
  plusOneOf?: string | null
  name: string
} | null

type SeatLayoutProps = {
  seats: SeatSlot[]
  members: TableMember[]
  joinCode: string
  /** Human-readable name: the owner's first name or the join code. */
  name: string
  nameMode: TableNameMode
  /** Owner or admin: may switch what the table is called. */
  canRename: boolean
  onRename?: (nameMode: TableNameMode) => Promise<void>
  eventSlug: string
  onSave: (seats: SeatAssignment[]) => Promise<void>
  /** Used to flag the viewer's own name and to restrict which seats they may move. */
  currentUserId?: string
  /** A member of this table, so the plan is theirs to arrange. */
  isMember: boolean
  /** Members can edit only while the owner's lock is off. */
  canEdit: boolean
  /** Owner or admin: may rearrange every seat. Everyone else may only move their own. */
  canManageAll: boolean
  locked: boolean
  /** Signed in but not at this table yet. */
  canJoin: boolean
  onJoin?: () => void
  joining?: boolean
  /** Why joining is unavailable, when it is. */
  joinBlockedReason?: string | null
}

// All seat geometry is expressed as a percentage of the square table box, so the
// whole ring scales with the container instead of overflowing on small screens.
// Keeping the gaps proportional also means seats never overlap, whatever
// `seatsPerTable` is set to (2–20).
const SEAT_GAP = 2

/** Largest diameter that fits N seats in a non-overlapping ring inside the box. */
const diameterFor = (count: number): number => {
  const seats = Math.max(count, 1)
  const solved = (100 * Math.PI - seats * SEAT_GAP) / (seats + Math.PI)
  return Math.min(34, solved)
}

const isMySeat = (seat: SeatSlot, userId?: string, userName?: string): boolean => {
  if (!seat) return false
  if (seat.userId) return seat.userId === userId
  return Boolean(userName) && seat.name === userName
}

export const SeatLayout: React.FC<SeatLayoutProps> = ({
  seats,
  members,
  joinCode,
  name,
  nameMode,
  canRename,
  onRename,
  eventSlug,
  onSave,
  currentUserId,
  isMember,
  canEdit,
  canManageAll,
  locked,
  canJoin,
  onJoin,
  joining,
  joinBlockedReason,
}) => {
  const [editingSeat, setEditingSeat] = useState<number | null>(null)
  const [localSeats, setLocalSeats] = useState<SeatSlot[]>(seats)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  // The page polls every few seconds. Adopt server changes unless the viewer has
  // unsaved edits, so another member's update appears without clobbering theirs.
  useEffect(() => {
    if (!dirty) {
      setLocalSeats(seats)
    }
  }, [seats, dirty])

  const myMember = useMemo(
    () => members.find(member => member.id === currentUserId),
    [members, currentUserId],
  )

  const memberById = useMemo(() => new Map(members.map(member => [member.id, member])), [members])

  /** Plus-one seats a member has already placed, by member id. */
  const placedByMember = useMemo(() => {
    const placed = new Map<string, number>()
    for (const seat of localSeats) {
      if (!seat?.plusOneOf) continue
      placed.set(seat.plusOneOf, (placed.get(seat.plusOneOf) ?? 0) + 1)
    }
    return placed
  }, [localSeats])

  // Derived labels keep every plus-one seat named consistently ("Indigo's +1"),
  // matching what the server stores.
  const plusOneNameByIndex = useMemo(() => {
    const byMember = new Map<string, number[]>()
    localSeats.forEach((seat, index) => {
      if (!seat?.plusOneOf) return
      const list = byMember.get(seat.plusOneOf) ?? []
      list.push(index)
      byMember.set(seat.plusOneOf, list)
    })

    const names = new Map<number, string>()
    byMember.forEach((indexes, memberId) => {
      const first = firstNameOf(memberById.get(memberId)?.name)
      indexes
        .slice()
        .sort((a, b) => a - b)
        .forEach((index, position) => names.set(index, plusOneSeatLabel(first, position + 1)))
    })
    return names
  }, [localSeats, memberById])

  const seatCount = Math.max(localSeats.length, 1)
  const diameter = diameterFor(seatCount)
  const radius = 50 - diameter / 2
  // Font size tracks the circle so long names stay inside it at any seat count.
  const seatFont = `${(diameter * 0.15).toFixed(2)}cqw`

  const positionFor = useCallback(
    (index: number) => {
      const angle = (360 / seatCount) * index - 90
      const radian = (angle * Math.PI) / 180
      return {
        left: 50 + radius * Math.cos(radian),
        top: 50 + radius * Math.sin(radian),
      }
    },
    [radius, seatCount],
  )

  const isSeated = useCallback(
    (member: { id: string; name: string }): boolean =>
      localSeats.some(seat => seat !== null && isMySeat(seat, member.id, member.name)),
    [localSeats],
  )

  const seatLabel = useCallback(
    (index: number): string => {
      const seat = localSeats[index]
      if (!seat) return 'Free'
      if (seat.plusOneOf) {
        return plusOneNameByIndex.get(index) || seat.name || 'Plus-one'
      }
      return seat.name
    },
    [localSeats, plusOneNameByIndex],
  )

  const unassigned = members.filter(member => !isSeated(member))

  // Plus-one slots the viewer (or the owner, on everyone's behalf) could still
  // place, e.g. "Indigo's +2".
  const unplacedPlusOnes = members.flatMap(member => {
    if (!canManageAll && member.id !== currentUserId) return []
    const placed = placedByMember.get(member.id) ?? 0
    const allowance = Math.max(0, member.plusOneCount ?? 0)
    const first = firstNameOf(member.name)

    const slots: Array<{ key: string; label: string }> = []
    for (let position = placed + 1; position <= allowance; position++) {
      slots.push({
        key: `${member.id}-${position}`,
        label: plusOneSeatLabel(first, position),
      })
    }
    return slots
  })

  // Auto-dismiss transient confirmations; errors stay put until the next action.
  useEffect(() => {
    if (!message || message.type === 'error') return
    const timer = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [message])

  const assignSeat = (index: number, member: { id: string; name: string }) => {
    setLocalSeats(current => {
      const updated = [...current]
      // A guest holds one seat, so clear them from wherever they were.
      for (let i = 0; i < updated.length; i++) {
        if (isMySeat(updated[i], member.id, member.name)) {
          updated[i] = null
        }
      }
      updated[index] = { userId: member.id, name: member.name }
      return updated
    })
    setDirty(true)
    setEditingSeat(null)
    setMessage(null)
  }

  const assignPlusOneSeat = (index: number, member: TableMember) => {
    setLocalSeats(current => {
      const updated = [...current]
      updated[index] = { userId: null, plusOneOf: member.id, name: '' }
      return updated
    })
    setDirty(true)
    setEditingSeat(null)
    setMessage(null)
  }

  const clearSeat = (index: number) => {
    setLocalSeats(current => {
      const updated = [...current]
      updated[index] = null
      return updated
    })
    setDirty(true)
    setEditingSeat(null)
  }

  const handleSeatClick = (index: number) => {
    if (!canEdit) return

    const seat = localSeats[index]

    // Owners and admins open the guest picker on any seat.
    if (canManageAll) {
      setEditingSeat(current => (current === index ? null : index))
      setMessage(null)
      return
    }

    // Everyone else can only ever act on their own seat or their own plus-ones.
    const mine = isMySeat(seat, currentUserId, myMember?.name)
    const myPlusOne = Boolean(seat?.plusOneOf && seat.plusOneOf === currentUserId)

    if (seat && !mine && !myPlusOne) {
      setEditingSeat(null)
      setMessage({ type: 'info', text: `Seat #${index + 1} is taken by ${seatLabel(index)}.` })
      return
    }

    setEditingSeat(current => (current === index ? null : index))
    setMessage(null)
  }

  const handleToggleName = async () => {
    if (!onRename || renaming) return

    const next: TableNameMode = nameMode === 'joinCode' ? 'ownerName' : 'joinCode'
    setRenaming(true)
    setMessage(null)

    try {
      await onRename(next)
      setMessage({
        type: 'success',
        text:
          next === 'joinCode'
            ? 'The table now shows its join code.'
            : "The table now shows the owner's name.",
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to change the table name',
      })
    } finally {
      setRenaming(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const seatPositions: SeatAssignment[] = []
      localSeats.forEach((seat, index) => {
        if (!seat) return
        if (seat.userId) {
          seatPositions.push({ seatIndex: index, userId: seat.userId })
          return
        }
        if (seat.plusOneOf) {
          seatPositions.push({ seatIndex: index, plusOneOf: seat.plusOneOf })
          return
        }
        // Rows written before seats were keyed by user still carry a name only.
        seatPositions.push({ seatIndex: index, name: seat.name })
      })

      await onSave(seatPositions)
      setDirty(false)
      setMessage({ type: 'success', text: 'Seats saved!' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const editingPosition = editingSeat !== null ? positionFor(editingSeat) : null
  const editingBelow = editingPosition !== null && editingPosition.top <= 50
  // The popover is up to 46% of the box wide, so keep its centre at least 23% in
  // from either edge to stop it spilling out of the plan.
  const editingLeft = editingPosition ? Math.min(77, Math.max(23, editingPosition.left)) : null

  const editingSeatData = editingSeat !== null ? localSeats[editingSeat] : null
  const editingIsMySeat =
    editingSeat !== null && isMySeat(localSeats[editingSeat], currentUserId, myMember?.name)
  const editingIsMyPlusOne = Boolean(
    editingSeatData?.plusOneOf && editingSeatData.plusOneOf === currentUserId,
  )
  const editingIsFree = editingSeat !== null && !localSeats[editingSeat]

  const plusOneChoices = (index: number) =>
    members
      .filter(member => canManageAll || member.id === currentUserId)
      .map(member => {
        const placed = placedByMember.get(member.id) ?? 0
        const allowance = Math.max(0, member.plusOneCount ?? 0)
        if (placed >= allowance) return null

        return (
          <button
            type="button"
            key={`${member.id}-plus`}
            className={[classes.assignBtn, classes.plusOneBtn].join(' ')}
            onClick={() => assignPlusOneSeat(index, member)}
          >
            Add {plusOneSeatLabel(firstNameOf(member.name), placed + 1)}
          </button>
        )
      })

  return (
    <div className={classes.container}>
      <div className={classes.topBar}>
        <a href={`/booking/${eventSlug}`} className={classes.backBtn}>
          &#8592; Back to Tables
        </a>
      </div>

      <div className={classes.titleRow}>
        <h2 className={classes.title}>{name} - Seat Plan</h2>
        {canRename && onRename && (
          <button
            type="button"
            role="switch"
            aria-checked={nameMode === 'joinCode'}
            className={classes.nameToggle}
            onClick={handleToggleName}
            disabled={renaming}
            title={
              nameMode === 'joinCode'
                ? 'Name this table after its owner instead of the join code'
                : 'Name this table with its join code instead of the owner name'
            }
          >
            <span className={classes.switchTrack} aria-hidden="true">
              <span className={classes.switchKnob} />
            </span>
            <span className={classes.switchLabel}>{renaming ? 'Saving…' : 'Join code'}</span>
          </button>
        )}
      </div>

      <div className={classes.statusNotice}>
        {isMember ? (
          locked ? (
            <span>🔒 This table is locked. The owner can unlock it to make changes.</span>
          ) : canManageAll ? (
            <span>Click any seat to arrange the table, including everyone&apos;s plus-ones.</span>
          ) : (
            <span>
              Click a free seat to sit there or add a plus-one, or your own seat to give it up.
            </span>
          )
        ) : canJoin ? (
          <span className={classes.joinRow}>
            <span>This table has space — join it to take a seat.</span>
            <button type="button" className={classes.saveBtn} onClick={onJoin} disabled={joining}>
              {joining ? 'Joining...' : 'Join Table'}
            </button>
          </span>
        ) : (
          <span>{joinBlockedReason || 'You cannot join this table.'}</span>
        )}
      </div>

      <div className={classes.legend}>
        <span className={classes.legendItem}>
          <i className={[classes.swatch, classes.swatchFree].join(' ')} /> Free
        </span>
        <span className={classes.legendItem}>
          <i className={[classes.swatch, classes.swatchTaken].join(' ')} /> Taken
        </span>
        {isMember && (
          <span className={classes.legendItem}>
            <i className={[classes.swatch, classes.swatchMine].join(' ')} /> Your seat
          </span>
        )}
        {isMember && (
          <span className={classes.legendItem}>
            <i className={[classes.swatch, classes.swatchPlusOne].join(' ')} /> Plus-one
          </span>
        )}
      </div>

      <div className={classes.tableContainer}>
        <div className={classes.table}>
          <div className={classes.tableInner}>
            <span className={classes.tableLabel}>
              {nameMode === 'joinCode' ? 'Join code' : 'Table'}
            </span>
            <span className={classes.tableName}>{nameMode === 'joinCode' ? joinCode : name}</span>
          </div>

          {localSeats.map((seat, index) => {
            const pos = positionFor(index)
            const occupied = seat !== null
            const mine = isMySeat(seat, currentUserId, myMember?.name)
            const myPlusOne = Boolean(seat?.plusOneOf && seat.plusOneOf === currentUserId)
            const isEditableSeat = canEdit && (canManageAll || mine || myPlusOne || !occupied)
            const label = seatLabel(index)

            return (
              <button
                type="button"
                key={index}
                className={[
                  classes.seat,
                  occupied ? classes.occupied : classes.free,
                  mine || myPlusOne ? classes.mine : '',
                  seat?.plusOneOf ? classes.plusOneSeat : '',
                  editingSeat === index ? classes.editing : '',
                  isEditableSeat ? '' : classes.readOnly,
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  width: `${diameter}%`,
                  height: `${diameter}%`,
                  fontSize: seatFont,
                }}
                onClick={() => handleSeatClick(index)}
                title={
                  occupied
                    ? `Seat #${index + 1} — ${label}${mine || myPlusOne ? ' (you)' : ''}`
                    : `Seat #${index + 1} — free`
                }
                aria-label={`Seat #${index + 1}, ${occupied ? `taken by ${label}` : 'free'}`}
              >
                <span className={classes.seatInner}>
                  <span className={classes.seatIndex}>
                    #{index + 1}
                    {seat?.plusOneOf ? ' +1' : ''}
                  </span>
                  {occupied ? (
                    <span className={classes.seatName}>{label}</span>
                  ) : (
                    <span className={classes.seatFree}>Free</span>
                  )}
                </span>
              </button>
            )
          })}

          {editingSeat !== null && canEdit && editingPosition && (
            <div
              className={classes.seatEditor}
              style={{
                left: `${editingLeft}%`,
                top: `${editingPosition.top}%`,
                marginTop: `${(editingBelow ? 1 : -1) * (diameter / 2 + 2)}%`,
                transform: editingBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              }}
              // Stop clicks inside the editor from reaching the seat underneath,
              // which used to reopen the menu the moment Cancel was pressed.
              onClick={event => event.stopPropagation()}
            >
              <div className={classes.editorInner}>
                <span className={classes.editorLabel}>Seat #{editingSeat + 1}</span>
                <div className={classes.editorOptions}>
                  {canManageAll &&
                    members.map(member => (
                      <button
                        type="button"
                        key={member.id}
                        className={classes.assignBtn}
                        onClick={() => assignSeat(editingSeat, member)}
                      >
                        {member.name}
                        {member.id === currentUserId ? ' (you)' : ''}
                      </button>
                    ))}

                  {!canManageAll && isMember && !locked && editingIsFree && myMember && (
                    <button
                      type="button"
                      className={classes.assignBtn}
                      onClick={() => assignSeat(editingSeat, myMember)}
                    >
                      {isSeated(myMember) ? 'Move me here' : 'Seat me here'}
                    </button>
                  )}

                  {!locked && (editingIsFree || canManageAll) && plusOneChoices(editingSeat)}

                  {editingIsMySeat && !canManageAll && (
                    <button
                      type="button"
                      className={[classes.assignBtn, classes.clearBtn].join(' ')}
                      onClick={() => clearSeat(editingSeat)}
                    >
                      Give up my seat
                    </button>
                  )}

                  {editingIsMyPlusOne && (
                    <button
                      type="button"
                      className={[classes.assignBtn, classes.clearBtn].join(' ')}
                      onClick={() => clearSeat(editingSeat)}
                    >
                      Remove this plus-one
                    </button>
                  )}

                  {canManageAll && editingSeatData && (
                    <button
                      type="button"
                      className={[classes.assignBtn, classes.clearBtn].join(' ')}
                      onClick={() => clearSeat(editingSeat)}
                    >
                      Clear seat
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className={classes.cancelBtn}
                  onClick={() => setEditingSeat(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMember && (unassigned.length > 0 || unplacedPlusOnes.length > 0) && (
        <div className={classes.unassigned}>
          <h4>Not yet seated:</h4>
          <div className={classes.unassignedList}>
            {unassigned.map(member => (
              <span key={member.id} className={classes.unassignedName}>
                {member.name}
                {member.id === currentUserId ? ' (you)' : ''}
              </span>
            ))}
            {unplacedPlusOnes.map(slot => (
              <span key={slot.key} className={classes.unassignedPlusOne}>
                {slot.label}
              </span>
            ))}
          </div>
          {canEdit && !locked && (
            <p className={classes.unassignedHint}>
              {unplacedPlusOnes.length > 0
                ? 'Click a free seat and choose a plus-one to place them there.'
                : 'Click a free seat above to take it.'}
            </p>
          )}
        </div>
      )}

      {canEdit && (
        <div className={classes.saveRow}>
          {message && (
            <span
              className={
                message.type === 'success'
                  ? classes.successMsg
                  : message.type === 'error'
                  ? classes.errorMsg
                  : classes.infoMsg
              }
            >
              {message.text}
            </span>
          )}
          <button
            type="button"
            className={classes.saveBtn}
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? 'Saving...' : 'Save Seats'}
          </button>
        </div>
      )}
    </div>
  )
}
