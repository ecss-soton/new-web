'use client'

import React, { useMemo, useState } from 'react'

import type { CityChallengeLocation } from '../../../../payload/payload-types'
import { rubikMono } from '../../../_utilities/font'

import classes from './index.module.scss'

type Props = {
  locations: CityChallengeLocation[]
  completedChallenges: string[]
  isLead: boolean
  teamId: string
  token: string
  error?: string | null
}

const NO_ZONE = 'No Zone'

const getSafeLink = (value?: string | null): string | null => {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}

/** Returns the best destination link for a challenge:
 *  1. Validated CMS external link (highest priority)
 *  2. Generated Google Maps URL from complete coordinates
 *  3. null when neither is available
 */
const getDestinationLink = (
  location: CityChallengeLocation,
): { href: string; label: string } | null => {
  const safe = getSafeLink(location.link)
  if (safe) return { href: safe, label: 'Open link now' }

  if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
    return {
      href: `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
      label: 'Get me there →',
    }
  }

  return null
}

export const ChallengeList: React.FC<Props> = ({
  locations,
  completedChallenges: initialCompleted,
  isLead,
  teamId,
  token,
  error: initialError,
}) => {
  const [completed, setCompleted] = useState<string[]>(initialCompleted)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(initialError ?? null)

  const groups = useMemo(() => {
    const sorted = [...locations].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const zones = new Map<string, CityChallengeLocation[]>()
    for (const location of sorted) {
      const zone = location.zone?.trim() || NO_ZONE
      if (!zones.has(zone)) zones.set(zone, [])
      zones.get(zone)!.push(location)
    }
    return Array.from(zones.entries())
  }, [locations])

  const toggleComplete = async (locationId: string) => {
    if (submitting) return
    setSubmitting(locationId)
    setError(null)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams/${teamId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `JWT ${token}`,
          },
          body: JSON.stringify({ locationId }),
        },
      )

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Failed to update challenge')
        return
      }

      setCompleted(data.completedChallenges ?? [])
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(null)
    }
  }

  const locationIds = useMemo(() => new Set(locations.map(location => location.id)), [locations])
  const completedCount = completed.filter(id => locationIds.has(id)).length
  const totalCount = locations.length

  return (
    <div className={classes.container}>
      {isLead && (
        <p className={classes.leadHint}>Tick each task off once all of your team has done it.</p>
      )}

      <div className={classes.progress}>
        <span className={classes.progressText}>
          {completedCount} / {totalCount} completed
        </span>
        <div className={classes.progressBar}>
          <div
            className={classes.progressFill}
            style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {error && (
        <p className={classes.error} role="alert">
          {error}
        </p>
      )}

      <div className={classes.list}>
        {groups.map(([zone, items]) => (
          <div key={zone} className={classes.zoneGroup}>
            <h2 className={[classes.zoneTitle, rubikMono.className].join(' ')}>{zone}</h2>
            {items.map(location => {
              const isCompleted = completed.includes(location.id)
              const isLoading = submitting === location.id
              const destination = getDestinationLink(location)

              return (
                <div
                  key={location.id}
                  className={[classes.card, isCompleted ? classes.cardCompleted : ''].join(' ')}
                >
                  <div className={classes.cardContent}>
                    <div className={classes.cardHeader}>
                      {isLead ? (
                        <button
                          type="button"
                          className={[
                            classes.checkbox,
                            isCompleted ? classes.checkboxChecked : '',
                          ].join(' ')}
                          onClick={() => toggleComplete(location.id)}
                          disabled={isLoading}
                          aria-label={`Mark "${location.name}" as ${
                            isCompleted ? 'incomplete' : 'complete'
                          }`}
                        >
                          {isCompleted && (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        <div
                          className={[
                            classes.statusDot,
                            isCompleted ? classes.statusDotComplete : '',
                          ].join(' ')}
                        />
                      )}
                      <h3 className={classes.cardTitle}>{location.name}</h3>
                    </div>
                    {location.description && (
                      <p className={classes.cardDescription}>{location.description}</p>
                    )}
                    <div className={classes.cardMeta}>
                      {destination && (
                        <a
                          href={destination.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={classes.mapsLink}
                        >
                          {destination.label}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {totalCount === 0 && <p className={classes.empty}>No challenges available yet.</p>}
    </div>
  )
}
