'use client'

import React, { useEffect, useRef, useState } from 'react'

import { bungee } from '../../../_utilities/font'

import classes from './index.module.scss'

type MemberSummary = { id: string; name?: string | null; username?: string | null }

type SearchResult = MemberSummary & { available?: boolean; reason?: string }

type Props = {
  teamId: string
  teamName: string
  members: MemberSummary[]
  token: string
}

const displayName = (member: MemberSummary): string =>
  member.name || member.username || 'Unknown member'

export const TeamPanel: React.FC<Props> = ({
  teamId,
  teamName,
  members: initialMembers,
  token,
}) => {
  const [members, setMembers] = useState<MemberSummary[]>(initialMembers)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (blurTimer.current) clearTimeout(blurTimer.current)
    }
  }, [])

  // Debounced member search.
  useEffect(() => {
    const trimmed = query.trim()
    abortRef.current?.abort()

    if (trimmed.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setSearching(true)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${
            process.env.NEXT_PUBLIC_SERVER_URL
          }/api/city-challenge-teams/${teamId}/member-search?q=${encodeURIComponent(trimmed)}`,
          {
            headers: { Authorization: `JWT ${token}` },
            signal: controller.signal,
          },
        )
        if (!res.ok) {
          setResults([])
          return
        }
        const data = await res.json()
        setResults(Array.isArray(data.results) ? data.results : [])
        setHighlight(0)
        setOpen(true)
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') setResults([])
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, teamId, token])

  const applyRoster = (data: { members?: MemberSummary[] }) => {
    if (Array.isArray(data.members)) setMembers(data.members)
  }

  const addMember = async (member: MemberSummary) => {
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
          body: JSON.stringify({ action: 'add', userId: member.id }),
        },
      )

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Failed to add member')
        return
      }

      applyRoster(data)
      setSuccess(`Added ${displayName(member)} to the team`)
      setQuery('')
      setResults([])
      setOpen(false)
    } catch {
      setError('Network error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeMember = async (member: MemberSummary) => {
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
          body: JSON.stringify({ action: 'remove', userId: member.id }),
        },
      )

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Failed to remove member')
        return
      }

      applyRoster(data)
      setSuccess(`Removed ${displayName(member)} from the team`)
    } catch {
      setError('Network error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => (h - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = results[highlight]
      if (selected && selected.available !== false) addMember(selected)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={classes.panel}>
      <h3 className={[classes.panelTitle, bungee.className].join(' ')}>Team: {teamName}</h3>

      <div className={classes.membersList}>
        <h4 className={classes.membersHeading}>Members ({members.length})</h4>
        {members.length === 0 ? (
          <p className={classes.emptyMembers}>No members yet. Add some below!</p>
        ) : (
          <ul className={classes.members}>
            {members.map(member => (
              <li key={member.id} className={classes.memberItem}>
                <span className={classes.memberInfo}>
                  <span className={classes.memberName}>{displayName(member)}</span>
                  {member.username && (
                    <span className={classes.memberHandle}>@{member.username}</span>
                  )}
                </span>
                <button
                  type="button"
                  className={classes.removeButton}
                  onClick={() => removeMember(member)}
                  disabled={isSubmitting}
                  aria-label={`Remove ${displayName(member)}`}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={classes.addForm}>
        <div className={classes.searchWrap}>
          <input
            type="text"
            className={classes.input}
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              if (results.length > 0) setOpen(true)
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 150)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search by name or username..."
            disabled={isSubmitting}
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls="cc-member-results"
            aria-autocomplete="list"
            aria-activedescendant={
              open && results.length > 0 ? `cc-member-option-${highlight}` : undefined
            }
          />
          {open && query.trim().length >= 2 && (
            <ul id="cc-member-results" role="listbox" className={classes.results}>
              {searching && <li className={classes.resultHint}>Searching…</li>}
              {!searching && results.length === 0 && (
                <li className={classes.resultHint}>No matching users</li>
              )}
              {results.map((result, index) => {
                const isAvailable = result.available !== false
                return (
                  <li
                    key={result.id}
                    id={`cc-member-option-${index}`}
                    role="option"
                    aria-selected={index === highlight}
                    aria-disabled={!isAvailable}
                    className={[
                      classes.result,
                      index === highlight ? classes.resultActive : '',
                      !isAvailable ? classes.resultDisabled : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseDown={e => e.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => {
                      if (isAvailable) addMember(result)
                    }}
                  >
                    <span className={classes.resultName}>{displayName(result)}</span>
                    {result.username && (
                      <span className={classes.memberHandle}>@{result.username}</span>
                    )}
                    {!isAvailable && (
                      <span className={classes.resultNote}>{result.reason || 'Unavailable'}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {error && <p className={classes.error}>{error}</p>}
      {success && <p className={classes.success}>{success}</p>}
    </div>
  )
}
