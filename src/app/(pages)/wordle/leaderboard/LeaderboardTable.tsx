'use client'

import React, { useMemo, useState } from 'react'

import { inter } from '../../../_utilities/font'
import classes from './index.module.scss'

export interface LeaderboardEntry {
  userId: string
  displayName: string
  totalGames: number
  totalWins: number
  winRate: number
  currentStreak: number
  maxStreak: number
  avgGuesses: number
}

type SortColumn = 'wins' | 'accuracy' | 'longest' | 'streak' | 'avg'
type SortDirection = 'asc' | 'desc'

const DEFAULT_SORT: SortColumn = 'wins'
const DEFAULT_DIR: SortDirection = 'desc'

const NATURAL_DIR: Record<SortColumn, SortDirection> = {
  wins: 'desc',
  accuracy: 'desc',
  longest: 'desc',
  streak: 'desc',
  avg: 'asc',
}

export const LeaderboardTable: React.FC<{
  data: LeaderboardEntry[]
  currentUserId: string
}> = ({ data, currentUserId }) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>(DEFAULT_SORT)
  const [sortDir, setSortDir] = useState<SortDirection>(DEFAULT_DIR)

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aVal: number
      let bVal: number
      switch (sortColumn) {
        case 'wins':
          aVal = a.totalWins
          bVal = b.totalWins
          break
        case 'accuracy':
          aVal = a.winRate
          bVal = b.winRate
          break
        case 'longest':
          aVal = a.maxStreak
          bVal = b.maxStreak
          break
        case 'streak':
          aVal = a.currentStreak
          bVal = b.currentStreak
          break
        case 'avg':
        default:
          aVal = a.avgGuesses
          bVal = b.avgGuesses
          break
      }
      const primary = sortDir === 'asc' ? aVal - bVal : bVal - aVal
      if (primary !== 0) return primary
      return a.avgGuesses - b.avgGuesses
    })
    return sorted
  }, [data, sortColumn, sortDir])

  const handleHeaderClick = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDir(NATURAL_DIR[column])
    }
  }

  const renderHeader = (column: SortColumn, label: string) => {
    const isActive = sortColumn === column
    const arrow = isActive ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''
    return (
      <th
        className={`${classes.sortable} ${isActive ? classes.sorted : ''}`}
        onClick={() => handleHeaderClick(column)}
      >
        {label}
        {arrow}
      </th>
    )
  }

  if (data.length === 0) {
    return <p className={classes.emptyText}>No games played yet. Be the first!</p>
  }

  return (
    <div className={[classes.tableWrapper, inter.className].join(' ')}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            {renderHeader('wins', 'Wins')}
            {renderHeader('avg', 'Avg')}
            {renderHeader('streak', 'Streak')}
            {renderHeader('longest', 'Longest')}
            {renderHeader('accuracy', 'Accuracy')}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((entry, i) => (
            <tr
              key={entry.userId}
              className={entry.userId === currentUserId ? classes.highlight : ''}
            >
              <td className={classes.rankCell}>{i + 1}</td>
              <td>{entry.displayName}</td>
              <td>{entry.totalWins}</td>
              <td>{entry.avgGuesses.toFixed(1)}</td>
              <td>{entry.currentStreak}</td>
              <td>{entry.maxStreak}</td>
              <td>{entry.winRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
