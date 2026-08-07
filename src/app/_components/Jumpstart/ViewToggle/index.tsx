'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import classes from './index.module.scss'

export const JumpstartViewToggle: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view') || 'timeline'

  const setView = (view: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'timeline') {
      params.delete('view')
    } else {
      params.set('view', view)
    }
    const query = params.toString()
    router.replace(query ? `/?${query}` : '/', { scroll: false })
  }

  return (
    <div className={classes.toggle}>
      <button
        type="button"
        aria-pressed={currentView === 'timeline'}
        className={[classes.option, currentView === 'timeline' ? classes.active : ''].join(' ')}
        onClick={() => setView('timeline')}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        Timeline
      </button>
      <button
        type="button"
        aria-pressed={currentView === 'map'}
        className={[classes.option, currentView === 'map' ? classes.active : ''].join(' ')}
        onClick={() => setView('map')}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        Map
      </button>
    </div>
  )
}
