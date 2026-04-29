'use client'

import React, { useCallback, useState } from 'react'

import classes from './index.module.scss'

type SeatLayoutProps = {
  seats: (string | null)[]
  members: { id: string; name: string }[]
  yourTable: boolean
  joinCode: string
  eventSlug: string
  onSave: (seats: { seatIndex: number; name: string }[]) => Promise<void>
}

const TABLE_RADIUS = 140 // px
const SEAT_SIZE = 100 // px

export const SeatLayout: React.FC<SeatLayoutProps> = ({
  seats,
  members,
  yourTable,
  joinCode,
  eventSlug,
  onSave,
}) => {
  const [editingSeat, setEditingSeat] = useState<number | null>(null)
  const [localSeats, setLocalSeats] = useState<(string | null)[]>(seats)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const getSeatPosition = useCallback((index: number, total: number) => {
    const angle = (360 / total) * index - 90
    const radian = (angle * Math.PI) / 180
    const x = TABLE_RADIUS * Math.cos(radian)
    const y = TABLE_RADIUS * Math.sin(radian)
    return { x, y, angle }
  }, [])

  const unassigned = members.filter(m => !localSeats.some(s => s === m.name))

  const handleSeatClick = (index: number) => {
    if (!yourTable) return
    if (editingSeat === index) {
      setEditingSeat(null)
    } else {
      setEditingSeat(index)
    }
  }

  const handleAssign = (index: number, name: string) => {
    const updated = [...localSeats]
    // Clear this person from any other seat they occupy
    for (let i = 0; i < updated.length; i++) {
      if (updated[i] === name) {
        updated[i] = null
      }
    }
    updated[index] = name
    setLocalSeats(updated)
    setEditingSeat(null)
  }

  const handleClear = (index: number) => {
    const updated = [...localSeats]
    updated[index] = null
    setLocalSeats(updated)
    setEditingSeat(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const seatPositions = localSeats
        .map((name, i) => ({ seatIndex: i, name: name || '' }))
        .filter(s => s.name !== '')
      await onSave(seatPositions)
      setMessage({ type: 'success', text: 'Seats saved!' })
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const seatCount = seats.length

  return (
    <div className={classes.container}>
      <div className={classes.topBar}>
        <a href={`/booking/${eventSlug}`} className={classes.backBtn}>
          &#8592; Back to Tables
        </a>
      </div>
      <h2 className={classes.title}>Table {joinCode} - Seat Plan</h2>

      <div className={classes.tableContainer}>
        <div className={classes.table}>
          <div className={classes.tableInner}>
            <span className={classes.tableLabel}>Table</span>
            <span className={classes.tableCode}>{joinCode}</span>
          </div>

          {localSeats.map((seat, index) => {
            const pos = getSeatPosition(index, seatCount)
            const isEditing = editingSeat === index
            const isOccupied = seat !== null

            return (
              <div
                key={index}
                className={[
                  classes.seat,
                  isOccupied ? classes.occupied : classes.free,
                  isEditing ? classes.editing : '',
                ].join(' ')}
                style={{
                  left: `calc(50% + ${pos.x}px - ${SEAT_SIZE / 2}px)`,
                  top: `calc(50% + ${pos.y}px - ${SEAT_SIZE / 2}px)`,
                  transform: `rotate(${pos.angle + 90}deg)`,
                  zIndex: isEditing ? 10 : undefined,
                }}
                onClick={() => handleSeatClick(index)}
              >
                <div
                  className={classes.seatInner}
                  style={{ transform: `rotate(-${pos.angle + 90}deg)` }}
                >
                  <span className={classes.seatIndex}>#{index + 1}</span>
                  {isOccupied ? (
                    <span className={classes.seatName}>{seat}</span>
                  ) : (
                    <span className={classes.seatFree}>Free</span>
                  )}
                </div>

                {isEditing && yourTable && (
                  <div
                    className={classes.seatEditor}
                    style={{ transform: `rotate(-${pos.angle + 90}deg)` }}
                  >
                    <div className={classes.editorInner}>
                      <span className={classes.editorLabel}>Assign seat #{index + 1}</span>
                      <div className={classes.editorOptions}>
                        {members.map(m => (
                          <button
                            key={m.id}
                            className={classes.assignBtn}
                            onClick={() => handleAssign(index, m.name)}
                          >
                            {m.name}
                          </button>
                        ))}
                        {isOccupied && (
                          <button
                            className={[classes.assignBtn, classes.clearBtn].join(' ')}
                            onClick={() => handleClear(index)}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <button className={classes.cancelBtn} onClick={() => setEditingSeat(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {unassigned.length > 0 && yourTable && (
        <div className={classes.unassigned}>
          <h4>Not yet seated:</h4>
          <div className={classes.unassignedList}>
            {unassigned.map(m => (
              <span key={m.id} className={classes.unassignedName}>
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {yourTable && (
        <div className={classes.saveRow}>
          {message && (
            <span className={message.type === 'success' ? classes.successMsg : classes.errorMsg}>
              {message.text}
            </span>
          )}
          <button className={classes.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Seats'}
          </button>
        </div>
      )}
    </div>
  )
}
