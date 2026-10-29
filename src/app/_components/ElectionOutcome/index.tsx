'use client'

import React, { useEffect, useState } from 'react'
import qs from 'qs'

import { Election, ElectionResult, Position } from '../../../payload/payload-types'
import { nominationShortName } from '../../../utilities/nominationLabel'
import { ElectionResults } from '../ElectionResults'

import classes from './index.module.scss'

const positionIdOf = (position: ElectionResult['position']): string =>
  typeof position === 'string' ? position : position?.id

/**
 * Post-election summary shown on the public elections page.
 *
 * The winner of every position is always shown once the result is published.
 * `showOnMainPage` only controls whether the detailed round-by-round chart,
 * other candidates and transcript are available under a disclosure.
 */
export const ElectionOutcome: React.FC<{
  election: Election
  positions: Position[]
}> = ({ election, positions }) => {
  const [results, setResults] = useState<ElectionResult[] | null>(null)
  const [error, setError] = useState('')
  const [expandedPositionId, setExpandedPositionId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      setResults(null)
      setError('')

      const searchQuery = qs.stringify(
        {
          depth: 2,
          limit: 100,
          where: {
            election: {
              equals: election.id,
            },
          },
        },
        { encode: false },
      )

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/electionResults?${searchQuery}`,
          { credentials: 'include', cache: 'no-store' },
        )

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }

        const json = (await response.json()) as { docs?: ElectionResult[] }
        if (!cancelled) setResults(json.docs ?? [])
      } catch {
        if (!cancelled) setError('Could not load election results.')
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [election.id])

  if (error) {
    return <p className={classes.error}>{error}</p>
  }

  if (results === null) {
    return <p className={classes.status}>Loading results…</p>
  }

  const orderedPositions = [...positions].sort((a, b) => a.importance - b.importance)

  if (orderedPositions.length === 0) {
    return null
  }

  // Non-admins only receive published docs, but an admin viewing the public page
  // may also receive drafts; never show those here.
  const latestByPosition = new Map<string, ElectionResult>()
  for (const result of results) {
    if (result._status === 'draft') continue

    const positionId = positionIdOf(result.position)
    if (!positionId) continue

    const existing = latestByPosition.get(positionId)
    if (
      !existing ||
      new Date(result.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
    ) {
      latestByPosition.set(positionId, result)
    }
  }

  return (
    <section className={classes.outcome}>
      <h3 className={classes.heading}>Elected</h3>
      <ul className={classes.list}>
        {orderedPositions.map(position => {
          const result = latestByPosition.get(position.id)
          const canExpand = Boolean(result?.showOnMainPage)
          const expanded = expandedPositionId === position.id
          const detailId = `election-result-${position.id}`

          return (
            <li key={position.id} className={classes.item}>
              <div className={classes.summaryRow}>
                <span className={classes.positionName}>{position.name}</span>
                {result ? (
                  <span className={classes.winner}>
                    {nominationShortName(result.electedNominee ?? null)}
                  </span>
                ) : (
                  <span className={classes.pending}>Results not published yet</span>
                )}
                {canExpand && (
                  <button
                    type="button"
                    className={classes.toggle}
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    onClick={() => setExpandedPositionId(expanded ? null : position.id)}
                  >
                    {expanded ? 'Hide full result' : 'Show full result'}
                  </button>
                )}
              </div>
              {expanded && result && canExpand && (
                <div className={classes.details} id={detailId}>
                  <ElectionResults result={result} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
