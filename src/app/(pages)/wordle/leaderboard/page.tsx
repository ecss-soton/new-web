import React from 'react'
import { Metadata } from 'next'

import { Gutter } from '../../../_components/Gutter'
import { LowImpactHero } from '../../../_heros/LowImpact'
import { getMeUser } from '../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../_utilities/mergeOpenGraph'

import classes from './index.module.scss'

interface LeaderboardEntry {
  userId: string
  displayName: string
  totalGames: number
  totalWins: number
  winRate: number
  currentStreak: number
  maxStreak: number
  avgGuesses: number
}

export default async function LeaderboardPage() {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to view the leaderboard.',
    )}&redirect=${encodeURIComponent('/wordle/leaderboard')}`,
  })

  let leaderboard: LeaderboardEntry[] = []

  try {
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-scores/leaderboard`, {
      headers: { Authorization: `JWT ${token}` },
    })
    const json = await req.json()
    leaderboard = json.leaderboard || []
  } catch (err) {
    console.warn('Failed to fetch leaderboard:', err) // eslint-disable-line no-console
  }

  return (
    <>
      <LowImpactHero title="ECSSle Leaderboard" type="lowImpact" />
      <Gutter>
        <div className={classes.leaderboardWrapper}>
          {leaderboard.length === 0 ? (
            <p className={classes.emptyText}>No games played yet. Be the first!</p>
          ) : (
            <div className={classes.tableWrapper}>
              <table className={classes.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Wins</th>
                    <th>Accuracy</th>
                    <th>Streak</th>
                    <th>Best</th>
                    <th>Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={entry.userId}
                      className={entry.userId === user.id ? classes.highlight : ''}
                    >
                      <td className={classes.rankCell}>{i + 1}</td>
                      <td>{entry.displayName}</td>
                      <td>{entry.totalWins}</td>
                      <td>{entry.winRate}%</td>
                      <td>{entry.currentStreak}</td>
                      <td>{entry.maxStreak}</td>
                      <td>{entry.avgGuesses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Gutter>
    </>
  )
}

export const metadata: Metadata = {
  title: 'ECSSle Leaderboard',
  description: 'See how you rank against other ECSSle players.',
  openGraph: mergeOpenGraph({
    title: 'ECSSle Leaderboard',
    url: '/wordle/leaderboard',
  }),
}
