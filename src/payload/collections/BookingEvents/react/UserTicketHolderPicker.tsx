import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'payload/components'

type SearchUser = {
  id: string
  name?: string | null
  username?: string | null
}

type AddResult = {
  success?: boolean
  summary?: string
  created?: number
  skipped?: number
  warnings?: string[]
  error?: string
}

const label = (user: SearchUser): string => (user.name as string) || (user.username as string) || ''

/**
 * Adds website accounts to an event's guest list directly from the booking event
 * edit screen. It mirrors the relationship field's "search by name" autocomplete:
 * pick accounts, then add them in one go. Only missing guests are created, with
 * no plus-ones and no dietary requirements.
 */
export const UserTicketHolderPicker: React.FC<{ eventId: string | null }> = ({ eventId }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [selected, setSelected] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const requestRef = useRef(0)

  useEffect(() => {
    const term = query.trim()

    if (term.length < 2) {
      requestRef.current++
      setResults([])
      setSearching(false)
      return
    }

    const requestId = ++requestRef.current
    const controller = new AbortController()
    setSearching(true)

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ depth: '0', limit: '10', sort: 'name' })
        params.set('where[or][0][name][like]', term)
        params.set('where[or][1][username][like]', term)

        const res = await fetch(`/api/users?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (requestId !== requestRef.current) return

        if (!res.ok) throw new Error(`Search failed (${res.status})`)

        const json = (await res.json().catch(() => ({}))) as { docs?: SearchUser[] }
        if (requestId !== requestRef.current) return

        setResults(json.docs || [])
        setError(null)
      } catch (err: unknown) {
        if (requestId !== requestRef.current) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        if (requestId === requestRef.current) setSearching(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const isSelected = useCallback((id: string) => selected.some(user => user.id === id), [selected])

  const toggleUser = (user: SearchUser) => {
    setMessage(null)
    setSelected(current => {
      const exists = current.some(entry => entry.id === user.id)
      return exists ? current.filter(entry => entry.id !== user.id) : [...current, user]
    })
  }

  const addSelected = async () => {
    if (!eventId || selected.length === 0 || adding) return

    setAdding(true)
    setError(null)
    setMessage(null)
    setWarnings([])

    try {
      const res = await fetch('/api/ticket-holders/import-users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, userIds: selected.map(user => user.id) }),
      })

      const json = (await res.json().catch(() => ({}))) as AddResult

      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)

      setMessage(json.summary || 'Ticket holders added.')
      setWarnings(json.warnings || [])
      setSelected([])
      setResults([])
      setQuery('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add those users')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>Add website users to the guest list</h3>
      <p style={{ marginTop: 0 }}>
        Search by name or university username and add accounts directly. Each one is added with a
        plus-one count of 0 and no dietary requirements; guests already on the list are skipped. Use
        the Tickets table afterwards to give someone plus-ones or dietary notes.
      </p>

      <input
        type="search"
        value={query}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
        // The admin edit view is a form; Enter must not submit/save the event.
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') event.preventDefault()
        }}
        placeholder="Search users by name or username"
        disabled={!eventId || adding}
        style={{ width: '100%', padding: '0.5rem' }}
        aria-label="Search website users"
      />

      {searching && <p style={{ margin: '0.25rem 0' }}>Searching…</p>}

      {!searching && query.trim().length >= 2 && results.length === 0 && !error && (
        <p style={{ margin: '0.25rem 0' }}>No users matched that search.</p>
      )}

      {results.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0' }}>
          {results.map(user => {
            const hasUsername = Boolean((user.username || '').trim())
            const chosen = isSelected(user.id)

            return (
              <li key={user.id} style={{ padding: '0.15rem 0' }}>
                <Button
                  type="button"
                  onClick={() => toggleUser(user)}
                  disabled={!hasUsername || adding}
                  buttonStyle={chosen ? 'primary' : 'secondary'}
                >
                  {chosen ? '✓ ' : '+ '}
                  {label(user)}
                  {user.username ? ` (${user.username})` : ' — no university username'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {selected.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <p style={{ margin: '0 0 0.25rem' }}>Selected: {selected.map(label).join(', ')}</p>
          <Button
            type="button"
            onClick={addSelected}
            disabled={!eventId || adding || selected.length === 0}
          >
            {adding
              ? 'Adding…'
              : `Add ${selected.length} user${selected.length === 1 ? '' : 's'} as ticket holders`}
          </Button>
        </div>
      )}

      {!eventId && <p>Save the event first to enable adding users.</p>}

      {message && <p style={{ color: 'var(--theme-success-500)' }}>{message}</p>}
      {warnings.length > 0 && (
        <ul>
          {warnings.map((warning, index) => (
            <li key={index}>{warning}</li>
          ))}
        </ul>
      )}
      {error && <p style={{ color: 'var(--theme-error-500)' }}>{error}</p>}
    </div>
  )
}
