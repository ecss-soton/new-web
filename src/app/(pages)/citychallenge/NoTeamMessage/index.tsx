import React from 'react'

import classes from './index.module.scss'

export const NoTeamMessage: React.FC = () => {
  return (
    <div className={classes.container}>
      <div className={classes.icon}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <h2 className={classes.heading}>You&apos;re not in a team yet!</h2>
      <p className={classes.message}>
        Ask your team lead to add you to their team to start participating in the City Challenge.
      </p>
    </div>
  )
}
