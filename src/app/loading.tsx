import React from 'react'

export default function Loading() {
  return (
    <main className="page-container" aria-live="polite" aria-busy="true">
      <div className="status-screen">
        <p>Loading…</p>
      </div>
    </main>
  )
}
