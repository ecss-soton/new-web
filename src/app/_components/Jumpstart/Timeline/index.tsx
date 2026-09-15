import React from 'react'
import moment from 'moment-timezone'

import type { Event } from '../../../../payload/payload-types'
import { bungee, rubikMono } from '../../../_utilities/font'
import { JumpstartEventCard } from '../EventCard'
import { JumpstartViewToggle } from '../ViewToggle'

import classes from './index.module.scss'

type Props = {
  events: Event[]
  heading?: string | null
  subtitle?: string | null
  faqJumpLabel?: string | null
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
    if (!groups.has(key)) groups.set(key, [])
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

const getTodayKey = (): string => moment().tz(TIMEZONE).format('YYYY-MM-DD')

export const JumpstartTimeline: React.FC<Props> = ({ events, heading, subtitle, faqJumpLabel }) => {
  const groups = groupByDate(events)
  const sortedKeys = getSortedDateKeys(groups)
  const todayKey = getTodayKey()

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <h1 className={classes.heading}>{heading || 'Jumpstart'}</h1>
        {subtitle && <p className={classes.subtitle}>{subtitle}</p>}
      </div>

      <JumpstartViewToggle />

      <div className={classes.grid}>
        <a className={[classes.jumpToFaq, bungee.className].join(' ')} href="#faqs">
          {faqJumpLabel || 'Questions?'}
        </a>

        <div className={classes.timeline}>
          {sortedKeys.map(dateKey => {
            const dayEvents = groups.get(dateKey) || []
            const isToday = dateKey === todayKey
            const isPast = dateKey < todayKey

            return (
              <details
                key={dateKey}
                open={!isPast}
                className={[
                  classes.dayGroup,
                  isToday ? classes.dayGroupToday : '',
                  isPast ? classes.dayGroupPast : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <summary className={classes.dayHeader}>
                  <h2 className={[classes.dayTitle, rubikMono.className].join(' ')}>
                    {formatDayHeader(dateKey)}
                  </h2>
                  {isToday && <span className={classes.todayBadge}>Today</span>}
                  <span className={classes.dayCount}>
                    {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                  </span>
                  <span className={classes.chevron} aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </summary>
                <div className={classes.dayEvents}>
                  {dayEvents.map((event, i) => (
                    <JumpstartEventCard key={event.id} event={event} index={i} />
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      </div>
    </div>
  )
}
