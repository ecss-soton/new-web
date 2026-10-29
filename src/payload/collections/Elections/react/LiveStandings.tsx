import React, { useCallback, useState } from 'react'
import { useDocumentInfo } from 'payload/dist/admin/components/utilities/DocumentInfo'

import type { ElectionStandings } from '../../../utilities/electionStandings'

import './LiveStandings.scss'

interface StandingsResponse extends ElectionStandings {
  success?: boolean
  error?: string
}

const formatDate = (value?: string | null): string => {
  if (!value) return '?'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(date)
}

/**
 * Admin-only live first-preference standings for the election being edited.
 * It is a snapshot, not the official STV count, and shows no voter identities.
 */
export const LiveStandings: React.FC = () => {
  const { id } = useDocumentInfo()
  const [data, setData] = useState<ElectionStandings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClick = useCallback(async () => {
    if (!id || loading) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/elections/${encodeURIComponent(String(id))}/standings`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      const json = (await response.json().catch(() => null)) as StandingsResponse | null

      if (!response.ok || !json?.success) {
        throw new Error(json?.error || `Request failed (${response.status})`)
      }

      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not calculate live standings.')
    } finally {
      setLoading(false)
    }
  }, [id, loading])

  return (
    <div className="liveStandings">
      <h3 className="liveStandings__title">Live standings</h3>
      <p className="liveStandings__note">
        First-preference snapshot only — this is not the official STV result. The official result is
        produced after voting closes and appears in Election Results.
      </p>

      {!id ? (
        <p className="liveStandings__note">Save the election before checking standings.</p>
      ) : (
        <button
          type="button"
          className="liveStandings__button"
          onClick={handleClick}
          disabled={loading}
        >
          {loading ? 'Calculating...' : data ? 'Refresh live standings' : 'Show live standings'}
        </button>
      )}

      {loading && (
        <p className="liveStandings__status" role="status">
          Reading votes...
        </p>
      )}
      {error && (
        <p className="liveStandings__error" role="alert">
          {error}
        </p>
      )}

      {data && (
        <div className="liveStandings__results">
          <p className="liveStandings__summary">
            <strong>{data.election.name}</strong> · {formatDate(data.election.votingStart)} →{' '}
            {formatDate(data.election.votingEnd)}
          </p>
          <p className="liveStandings__summary">
            {data.ballots} ballot(s) from {data.voters} voter(s)
          </p>

          {data.positions.length === 0 && (
            <p className="liveStandings__note">No positions found for this election.</p>
          )}

          {data.positions.map(position => (
            <section key={position.id} className="liveStandings__position">
              <h4 className="liveStandings__positionTitle">
                {position.name} <span>({position.ballots} ballot(s))</span>
              </h4>
              <table className="liveStandings__table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th className="liveStandings__num">1st prefs</th>
                    <th className="liveStandings__num">%</th>
                  </tr>
                </thead>
                <tbody>
                  {position.rows.map(row => (
                    <tr key={row.id} className={row.isRon ? 'liveStandings__ron' : undefined}>
                      <td>
                        {row.label}
                        {row.droppedOut ? ' [dropped out]' : ''}
                      </td>
                      <td className="liveStandings__num">{row.count}</td>
                      <td className="liveStandings__num">{row.percent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {position.blankFirstPreferences > 0 && (
                <p className="liveStandings__note">
                  {position.blankFirstPreferences} ballot(s) had no first preference.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
