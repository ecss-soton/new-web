'use client'

import React, { useEffect, useState } from 'react'

import { inter } from '../../../../_utilities/font'

import classes from './index.module.scss'

interface PreferenceResponse {
  hidden?: boolean
  error?: string
}

export const LeaderboardVisibilityToggle: React.FC<{ game: string }> = ({ game }) => {
  const [hidden, setHidden] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/game-prefs/me?game=${encodeURIComponent(
            game,
          )}`,
          { credentials: 'include' },
        )
        const payload = (await response.json().catch(() => null)) as PreferenceResponse | null

        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load your leaderboard preference')
        }

        if (!cancelled) setHidden(Boolean(payload?.hidden))
      } catch (loadError) {
        if (!cancelled) {
          setHidden(false)
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load your leaderboard preference',
          )
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [game])

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextHidden = !event.target.checked

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/game-prefs/me`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, hidden: nextHidden }),
      })
      const payload = (await response.json().catch(() => null)) as PreferenceResponse | null

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save your leaderboard preference')
      }

      setHidden(Boolean(payload?.hidden))
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save your leaderboard preference',
      )
    } finally {
      setSaving(false)
    }
  }

  if (hidden === null) {
    return (
      <p className={[classes.loading, inter.className].join(' ')}>
        Loading leaderboard preference…
      </p>
    )
  }

  return (
    <div className={[classes.wrap, inter.className].join(' ')}>
      <label className={classes.label}>
        <input
          type="checkbox"
          className={classes.checkbox}
          checked={!hidden}
          onChange={handleChange}
          disabled={saving}
        />
        Show me on the leaderboard
      </label>
      <p className={classes.hint}>
        {hidden
          ? 'You are hidden. Your scores are still recorded, but your row is not shown.'
          : 'You are shown. Your scores and stats appear on this leaderboard.'}
      </p>
      {error && (
        <p className={classes.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
