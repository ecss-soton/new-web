'use client'

import React, { useState } from 'react'

import type { CityChallengeLocation } from '../../../../payload/payload-types'

import classes from './index.module.scss'

type Props = {
  locations: CityChallengeLocation[]
  completedChallenges: string[]
  isLead: boolean
  teamId: string
  token: string
}

export const ChallengeList: React.FC<Props> = ({
  locations,
  completedChallenges: initialCompleted,
  isLead,
  teamId,
  token,
}) => {
  const [completed, setCompleted] = useState<string[]>(initialCompleted)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const sorted = [...locations].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  const toggleComplete = async (locationId: string) => {
    if (submitting) return
    setSubmitting(locationId)

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

      if (res.ok) {
        const data = await res.json()
        setCompleted(data.completedChallenges ?? [])
      }
    } catch {
      // network error — silent
    } finally {
      setSubmitting(null)
    }
  }

  const completedCount = completed.length
  const totalCount = sorted.length

  return (
    <div className={classes.container}>
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

      <div className={classes.list}>
        {sorted.map(location => {
          const isCompleted = completed.includes(location.id)
          const isLoading = submitting === location.id

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
                  <span className={classes.coords}>
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classes.mapsLink}
                  >
                    Get me there &rarr;
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {sorted.length === 0 && <p className={classes.empty}>No challenges available yet.</p>}
    </div>
  )
}
