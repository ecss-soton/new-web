import React, { Fragment, useCallback, useState } from 'react'

interface ReapplyResponse {
  success?: boolean
  users?: number
  members?: number
  rolesAdded?: number
  alreadyHadRole?: number
  ambiguousNames?: number
  incompleteNames?: number
  noMatch?: number
  error?: string
}

/**
 * Admin-only action on the Member Imports collection. Reconciles every account
 * against the stored `susu-members` records without needing the original CSV.
 */
export const ReapplyMembershipsLink: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleClick = useCallback(async () => {
    if (loading) return

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/member-imports/reapply', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = (await response.json().catch(() => null)) as ReapplyResponse | null

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `Request failed (${response.status})`)
      }

      setMessage(
        `Checked ${data.users ?? 0} accounts against ${data.members ?? 0} active members: ` +
          `${data.rolesAdded ?? 0} new roles, ${data.alreadyHadRole ?? 0} already had 'susu', ` +
          `${data.ambiguousNames ?? 0} ambiguous, ${data.incompleteNames ?? 0} incomplete, ` +
          `${data.noMatch ?? 0} with no account.`,
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not re-apply memberships.')
    } finally {
      setLoading(false)
    }
  }, [loading])

  return (
    <Fragment>
      <p>
        Importing a CSV stores its members in the Membership &gt; SUSU Members collection and grants
        the <strong>susu</strong> role to matching accounts. Use this after fixing matching or to
        pick up accounts that existed before the latest import. New accounts are matched
        automatically when they first log in.
      </p>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? 'Re-applying memberships...' : 'Re-apply memberships to all accounts'}
      </button>
      {message && <p>{message}</p>}
      {error && <p style={{ color: 'var(--theme-error-500)' }}>{error}</p>}
    </Fragment>
  )
}
