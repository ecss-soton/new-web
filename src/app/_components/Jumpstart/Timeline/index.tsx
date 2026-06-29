import React from 'react'
import moment from 'moment-timezone'

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

const TIMEZONE = 'Europe/London'

const getDateKey = (dateStr: string): string => {
  return moment.utc(dateStr).tz(TIMEZONE).format('YYYY-MM-DD')
}

const formatDayHeader = (dateKey: string): string => {
  return moment(dateKey, 'YYYY-MM-DD').format('dddd Do MMMM')
}

const groupByDate = (events: Event[]): Map<string, Event[]> => {
  const groups = new Map<string, Event[]>()

  for (const event of events) {
    const key = getDateKey(event.date)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(event)
  }

  for (const [, dayEvents] of groups) {
    dayEvents.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }

  return groups
}

const getSortedDateKeys = (groups: Map<string, Event[]>): string[] => {
  return Array.from(groups.keys()).sort()
}

export const JumpstartTimeline: React.FC<Props> = ({ events, heading, subtitle }) => {
  const groups = groupByDate(events)
  const sortedKeys = getSortedDateKeys(groups)

  return (
    <div className={[classes.container, inter.className].join(' ')}>
      <div className={classes.header}>
        <h1 className={classes.heading}>{heading || 'Jumpstart'}</h1>
        {subtitle && <p className={classes.subtitle}>{subtitle}</p>}
      </div>

      <JumpstartViewToggle />

      <div className={classes.timeline}>
        {sortedKeys.map(dateKey => {
          const dayEvents = groups.get(dateKey) || []

          return (
            <div key={dateKey} className={classes.dayGroup}>
              <div className={classes.dayHeader}>
                <h2 className={classes.dayTitle}>{formatDayHeader(dateKey)}</h2>
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
