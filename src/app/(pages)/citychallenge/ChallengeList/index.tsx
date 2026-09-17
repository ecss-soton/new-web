'use client'

import React, { useEffect, useMemo, useState } from 'react'

import type { CityChallengeLocation } from '../../../../payload/payload-types'
import {
  type ChallengeProgressEntry,
  challengeProgressToMap,
  computeChallengeScore,
  getChallengeMaxCount,
  getChallengeUnitPoints,
  isChallengeComplete,
} from '../../../_utilities/cityChallenge'
import { bungee, rubikMono } from '../../../_utilities/font'
import {
  detectMapPlatform,
  getDestinationLink,
  type MapPlatform,
} from '../../../_utilities/mapLinks'

import classes from './index.module.scss'

type Props = {
  locations: CityChallengeLocation[]
  completedChallenges: string[]
  challengeProgress: ChallengeProgressEntry[]
  isLead: boolean
  teamId: string
  token: string
  error?: string | null
  exploredPercent?: number
}

const NO_ZONE = 'No Zone'

// Decorative per-zone accents (lime is deliberately excluded so it always
// means "complete"). Cyan is the page's primary interactive colour.
const ZONE_ACCENTS = [
  'var(--jumpstart-neon-cyan)',
  'var(--jumpstart-neon-magenta)',
  'var(--jumpstart-neon-orange)',
  'var(--jumpstart-neon-purple)',
]

const getPointsLabel = (location: CityChallengeLocation): string | null => {
  const unit = getChallengeUnitPoints(location)
  if (location.completionType === 'counter') {
    const max = getChallengeMaxCount(location)
    return unit > 0 ? `${unit} pts each · max ${max * unit} pts` : `${max} max`
  }
  return unit > 0 ? `${unit} pts` : null
}

export const ChallengeList: React.FC<Props> = ({
  locations,
  completedChallenges: initialCompleted,
  challengeProgress,
  isLead,
  teamId,
  token,
  error: initialError,
  exploredPercent = 0,
}) => {
  const [completed, setCompleted] = useState<string[]>(initialCompleted)
  const [progress, setProgress] = useState(() => challengeProgressToMap(challengeProgress))
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [platform, setPlatform] = useState<MapPlatform | null>(null)

  // Platform detection must run after mount so server and client markup match.
  useEffect(() => {
    setPlatform(detectMapPlatform())
  }, [])

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

  const score = useMemo(
    () => computeChallengeScore(locations, completed, progress),
    [locations, completed, progress],
  )

  const updateChallenge = async (location: CityChallengeLocation, count?: number) => {
    if (submitting) return
    setSubmitting(location.id)
    setError(null)

    try {
      const body =
        location.completionType === 'counter'
          ? { locationId: location.id, count: count ?? 0 }
          : { locationId: location.id }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams/${teamId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `JWT ${token}`,
          },
          body: JSON.stringify(body),
        },
      )

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Failed to update challenge')
        return
      }

      setCompleted(Array.isArray(data.completedChallenges) ? data.completedChallenges : [])
      setProgress(challengeProgressToMap(data.challengeProgress))
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(null)
    }
  }

  const totalCount = locations.length

  return (
    <div className={classes.container}>
      {isLead && (
        <p className={classes.leadHint}>
          Tick each task off once all of your team has done it, or update the count for counter
          challenges.
        </p>
      )}

      <div className={classes.progress}>
        <span className={classes.progressText}>
          {score.completed} / {totalCount} completed
        </span>
        <div className={classes.progressBar}>
          <div
            className={classes.progressFill}
            style={{ width: totalCount > 0 ? `${(score.completed / totalCount) * 100}%` : '0%' }}
          />
        </div>
        <span className={classes.scoreText}>
          Points: {score.earned} / {score.max}
        </span>
        <span className={classes.exploredText}>
          Southampton explored: {exploredPercent.toFixed(1)}%
        </span>
      </div>

      {error && (
        <p className={classes.error} role="alert">
          {error}
        </p>
      )}

      <div className={classes.list}>
        {groups.map(([zone, items], groupIndex) => (
          <div
            key={zone}
            className={classes.zoneGroup}
            style={
              {
                '--zone-accent': ZONE_ACCENTS[groupIndex % ZONE_ACCENTS.length],
              } as React.CSSProperties
            }
          >
            <h2 className={[classes.zoneTitle, rubikMono.className].join(' ')}>{zone}</h2>
            {items.map(location => {
              const isCounter = location.completionType === 'counter'
              const count = progress[location.id] ?? 0
              const max = getChallengeMaxCount(location)
              const isCompleted = isChallengeComplete(location, completed, progress)
              const isLoading = submitting === location.id
              const destination = getDestinationLink(location, platform)
              const pointsLabel = getPointsLabel(location)

              return (
                <div
                  key={location.id}
                  className={[classes.card, isCompleted ? classes.cardCompleted : ''].join(' ')}
                >
                  <div className={classes.cardContent}>
                    <div className={classes.cardHeader}>
                      {isCounter ? null : isLead ? (
                        <button
                          type="button"
                          className={[
                            classes.checkbox,
                            isCompleted ? classes.checkboxChecked : '',
                          ].join(' ')}
                          onClick={() => updateChallenge(location)}
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
                      <h3 className={[classes.cardTitle, bungee.className].join(' ')}>
                        {location.name}
                      </h3>
                    </div>
                    {location.description && (
                      <p className={classes.cardDescription}>{location.description}</p>
                    )}
                    {isCounter && (
                      <div className={classes.counterRow}>
                        {isLead && (
                          <button
                            type="button"
                            className={classes.counterButton}
                            onClick={() => updateChallenge(location, count - 1)}
                            disabled={isLoading || count <= 0}
                            aria-label={`Decrease progress for "${location.name}"`}
                          >
                            −
                          </button>
                        )}
                        <div
                          className={classes.counterTrack}
                          role="img"
                          aria-label={`${count} of ${max} completed`}
                        >
                          <div
                            className={classes.counterFill}
                            style={{
                              width: max > 0 ? `${Math.min(100, (count / max) * 100)}%` : '0%',
                            }}
                          />
                        </div>
                        <span className={classes.counterValue} aria-live="polite">
                          {count} / {max}
                        </span>
                        {isLead && (
                          <button
                            type="button"
                            className={classes.counterButton}
                            onClick={() => updateChallenge(location, count + 1)}
                            disabled={isLoading || count >= max}
                            aria-label={`Increase progress for "${location.name}"`}
                          >
                            +
                          </button>
                        )}
                      </div>
                    )}
                    <div className={classes.cardMeta}>
                      {pointsLabel && <span className={classes.pointsLabel}>{pointsLabel}</span>}
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
