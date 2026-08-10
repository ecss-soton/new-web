'use client'

import React, { useState } from 'react'

import type { User } from '../../../../payload/payload-types'

import classes from './index.module.scss'

type Props = {
  teamId: string
  teamName: string
  members: { id: string; name?: string | null; username?: string | null }[]
  token: string
}

export const TeamPanel: React.FC<Props> = ({
  teamId,
  teamName,
  members: initialMembers,
  token,
}) => {
  const [members, setMembers] = useState(initialMembers)
  const [username, setUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams/${teamId}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `JWT ${token}`,
          },
          body: JSON.stringify({ action: 'add', username: username.trim() }),
        },
      )

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to add member')
        return
      }

      setSuccess(`Added "${username.trim()}" to the team`)
      setUsername('')

      // Re-fetch team to get updated member details
      const teamRes = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams/${teamId}?depth=1`,
        { headers: { Authorization: `JWT ${token}` } },
      )
      if (teamRes.ok) {
        const teamData = await teamRes.json()
        const updatedMembers = (teamData.members || []).map((m: User | string) => {
          if (typeof m === 'string') return { id: m, name: null, username: null }
          return { id: m.id, name: m.name, username: m.username }
        })
        setMembers(updatedMembers)
      }
    } catch {
      setError('Network error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (memberUsername: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams/${teamId}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `JWT ${token}`,
          },
          body: JSON.stringify({ action: 'remove', username: memberUsername }),
        },
      )

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to remove member')
        return
      }

      setMembers(prev => prev.filter(m => m.username !== memberUsername))
      setSuccess(`Removed "${memberUsername}" from the team`)
    } catch {
      setError('Network error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={classes.panel}>
      <h3 className={classes.panelTitle}>Team: {teamName}</h3>

      <div className={classes.membersList}>
        <h4 className={classes.membersHeading}>Members ({members.length})</h4>
        {members.length === 0 ? (
          <p className={classes.emptyMembers}>No members yet. Add some below!</p>
        ) : (
          <ul className={classes.members}>
            {members.map(member => (
              <li key={member.id} className={classes.memberItem}>
                <span className={classes.memberName}>
                  {member.name || member.username || member.id}
                </span>
                {member.username && (
                  <button
                    type="button"
                    className={classes.removeButton}
                    onClick={() => handleRemove(member.username!)}
                    disabled={isSubmitting}
                    aria-label={`Remove ${member.username}`}
                  >
                    &times;
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className={classes.addForm} onSubmit={handleAdd}>
        <input
          type="text"
          className={classes.input}
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username to add..."
          disabled={isSubmitting}
        />
        <button
          type="submit"
          className={classes.addButton}
          disabled={isSubmitting || !username.trim()}
        >
          {isSubmitting ? '...' : 'Add'}
        </button>
      </form>

      {error && <p className={classes.error}>{error}</p>}
      {success && <p className={classes.success}>{success}</p>}
    </div>
  )
}
