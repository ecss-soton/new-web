import React, { Fragment, useCallback, useState } from 'react'
import { useDocumentInfo } from 'payload/dist/admin/components/utilities/DocumentInfo'

export const RecountVotesLink: React.FC = () => {
  const { id } = useDocumentInfo()
  const [loading, setLoading] = useState(false)
  const [recounted, setRecounted] = useState(false)
  const [error, setError] = useState(null)

  const handleClick = useCallback(
    async e => {
      e.preventDefault()
      if (loading || recounted) return

      setLoading(true)

      try {
        await fetch(`/api/electionResults/${id}/recount`, { method: 'POST' })
        setRecounted(true)
        // eslint-disable-next-line no-undef
        window.location.reload()
      } catch (err) {
        setError(err)
      }
    },
    [id, loading, recounted],
  )

  let message = ''
  if (loading) message = ' (recounting...)'
  if (recounted) message = ' (done!)'
  if (error) message = ` (error: ${error})`

  return (
    <Fragment>
      <p>
        Before publishing ensure no nominee has won 2 or more positions, if they have contact them
        and ask which one they want to keep. The unwanted nomination should be set to dropped out
        and then the vote recounted.
      </p>
      <a
        href={`/api/electionResults/${id}/recount`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
      >
        Recount vote
      </a>
      {message}
      <p></p>
      <p>Once this has be done for all positions you are safe to publish the changes.</p>
    </Fragment>
  )
}
