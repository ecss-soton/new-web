import React from 'react'

import type { Event } from '../../../../payload/payload-types'
import { inter } from '../../../_utilities/font'
import { JumpstartEventCard } from '../EventCard'
import { JumpstartViewToggle } from '../ViewToggle'

import classes from './index.module.scss'

type Props = {
  events: Event[]
  heading?: string | null
  subtitle?: string | null
}

const DAY_LABEL_ORDER = [
  'Day1-Monday',
  'Day2-Tuesday',
  'Day3-Wednesday',
  'Day4-Thursday',
  'Day5-Friday',
  'Day6-Saturday',
  'Day7-Sunday',
  'Day8-Monday',
  'Day9-Tuesday',
  'Day10-Wednesday',
]

const DAY_DISPLAY_NAMES: Record<string, string> = {
  'Day1-Monday': 'Day 1 — Monday',
  'Day2-Tuesday': 'Day 2 — Tuesday',
  'Day3-Wednesday': 'Day 3 — Wednesday',
  'Day4-Thursday': 'Day 4 — Thursday',
  'Day5-Friday': 'Day 5 — Friday',
  'Day6-Saturday': 'Day 6 — Saturday',
  'Day7-Sunday': 'Day 7 — Sunday',
  'Day8-Monday': 'Day 8 — Monday',
  'Day9-Tuesday': 'Day 9 — Tuesday',
  'Day10-Wednesday': 'Day 10 — Wednesday',
}

const groupByDay = (events: Event[]): Map<string, Event[]> => {
  const groups = new Map<string, Event[]>()

  for (const event of events) {
    const dayLabel = event.dayLabel || 'Other'
    if (!groups.has(dayLabel)) {
      groups.set(dayLabel, [])
    }
    groups.get(dayLabel)!.push(event)
  }

  for (const [, dayEvents] of groups) {
    dayEvents.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }

  return groups
}

const getSortedDayLabels = (groups: Map<string, Event[]>): string[] => {
  const labels = Array.from(groups.keys())
  return labels.sort((a, b) => {
    const aIndex = DAY_LABEL_ORDER.indexOf(a)
    const bIndex = DAY_LABEL_ORDER.indexOf(b)
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.localeCompare(b)
  })
}

export const JumpstartTimeline: React.FC<Props> = ({ events, heading, subtitle }) => {
  const groups = groupByDay(events)
  const sortedDayLabels = getSortedDayLabels(groups)

  return (
    <div className={[classes.container, inter.className].join(' ')}>
      <div className={classes.header}>
        <h1 className={classes.heading}>{heading || 'Jumpstart'}</h1>
        {subtitle && <p className={classes.subtitle}>{subtitle}</p>}
      </div>

      <JumpstartViewToggle />

      <div className={classes.timeline}>
        {sortedDayLabels.map(dayLabel => {
          const dayEvents = groups.get(dayLabel) || []
          const displayName = DAY_DISPLAY_NAMES[dayLabel] || dayLabel

          return (
            <div key={dayLabel} className={classes.dayGroup}>
              <div className={classes.dayHeader}>
                <h2 className={classes.dayTitle}>{displayName}</h2>
              </div>
              <div className={classes.dayEvents}>
                {dayEvents.map(event => (
                  <JumpstartEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
