'use client'

import React, { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error) // eslint-disable-line no-console
  }, [error])

  return (
    <main className="page-container">
      <h1>Something went wrong</h1>
      <p>We could not load this page. Please try again.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  )
}
