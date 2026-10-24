'use client'

import React, { useMemo, useState } from 'react'

import type { LeaderboardLabels, LeaderboardRow } from '../../../../../utilities/games/leaderboard'
import { inter } from '../../../../_utilities/font'

import classes from './index.module.scss'

type SortColumn = 'rating' | 'wins' | 'average' | 'longest' | 'streak' | 'accuracy'
type SortDirection = 'asc' | 'desc'

const DEFAULT_SORT: SortColumn = 'rating'
const DEFAULT_DIR: SortDirection = 'desc'

const NATURAL_DIR: Record<SortColumn, SortDirection> = {
  rating: 'desc',
  wins: 'desc',
  average: 'asc',
  longest: 'desc',
  streak: 'desc',
  accuracy: 'desc',
}

export const LeaderboardTable: React.FC<{
  rows: LeaderboardRow[]
  currentUserId: string
  labels: LeaderboardLabels
}> = ({ rows, currentUserId, labels }) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>(DEFAULT_SORT)
  const [sortDir, setSortDir] = useState<SortDirection>(DEFAULT_DIR)

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let aValue: number
      let bValue: number

      switch (sortColumn) {
        case 'wins':
          aValue = a.wins
          bValue = b.wins
          break
        case 'average':
          aValue = a.average
          bValue = b.average
          break
        case 'longest':
          aValue = a.maxStreak
          bValue = b.maxStreak
          break
        case 'streak':
          aValue = a.currentStreak
          bValue = b.currentStreak
          break
        case 'accuracy':
          aValue = a.winRate
          bValue = b.winRate
          break
        case 'rating':
        default:
          aValue = a.rating
          bValue = b.rating
          break
      }

      const primary = sortDir === 'asc' ? aValue - bValue : bValue - aValue
      if (primary !== 0) return primary
      return a.average - b.average
    })
  }, [rows, sortColumn, sortDir])

  const handleHeaderClick = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDir(previous => (previous === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortColumn(column)
    setSortDir(NATURAL_DIR[column])
  }

  const renderHeader = (column: SortColumn, label: string) => {
    const isActive = sortColumn === column
    const arrow = isActive ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

    return (
      <th
        className={[classes.sortable, isActive ? classes.sorted : ''].filter(Boolean).join(' ')}
        aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          className={classes.sortButton}
          onClick={() => handleHeaderClick(column)}
        >
          {label}
          {arrow}
        </button>
      </th>
    )
  }

  if (rows.length === 0) {
    return <p className={classes.emptyText}>No scores yet. Be the first!</p>
  }

  return (
    <div className={[classes.tableWrapper, inter.className].join(' ')}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            {renderHeader('rating', 'Rating')}
            {renderHeader('wins', labels.wins)}
            {renderHeader('average', labels.average)}
            {renderHeader('streak', 'Streak')}
            {renderHeader('longest', 'Longest')}
            {labels.showAccuracy && renderHeader('accuracy', 'Accuracy')}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr
              key={row.userId}
              className={row.userId === currentUserId ? classes.highlight : undefined}
            >
              <td className={classes.rankCell}>{index + 1}</td>
              <td>{row.displayName}</td>
              <td className={classes.ratingCell}>{row.rating}</td>
              <td>{row.wins}</td>
              <td>{row.average.toFixed(1)}</td>
              <td>{row.currentStreak}</td>
              <td>{row.maxStreak}</td>
              {labels.showAccuracy && <td>{row.winRate}%</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
