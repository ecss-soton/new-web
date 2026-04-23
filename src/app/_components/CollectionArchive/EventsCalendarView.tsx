'use client'

import React, { useMemo, useState } from 'react'
import moment from 'moment-timezone'

import { Event } from '../../../payload/payload-types'
import { EventItem } from '../EventItem'
// Import useAuth (adjust the path if necessary based on your folder structure)
import { useAuth } from '../../_providers/Auth'

import classes from './EventsCalendarView.module.scss'

export const EventsCalendarView: React.FC<{ events: Event[] }> = ({ events }) => {
  const { user } = useAuth() // Pull in the current user
  const [currentMonth, setCurrentMonth] = useState(() => moment().startOf('month'))
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const nextMonth = () => setCurrentMonth(moment(currentMonth).add(1, 'month'))
  const prevMonth = () => setCurrentMonth(moment(currentMonth).subtract(1, 'month'))

  const calendarDays = useMemo(() => {
    const startDay = moment(currentMonth).startOf('month').startOf('week') // sunday
    const endDay = moment(currentMonth).endOf('month').endOf('week') // saturday

    const day = startDay.clone().subtract(1, 'day')
    const days = []

    while (day.isBefore(endDay, 'day')) {
      days.push(day.add(1, 'day').clone())
    }
    return days
  }, [currentMonth])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>()
    events.forEach(e => {
      if (!e.date) return
      const dateStr = moment.utc(e.date).tz('Europe/London').format('YYYY-MM-DD')
      if (!map.has(dateStr)) {
        map.set(dateStr, [])
      }
      map.get(dateStr)!.push(e)
    })
    return map
  }, [events])

  // Helper function to check if the current user is interested in a specific event
  const isUserInterested = (eventId: string | number) => {
    if (!user || !(user as any).interestedEvents) return false
    const checkEventId = (e: any) => (typeof e === 'string' ? e === eventId : e?.id === eventId)
    return (user as any).interestedEvents.some(checkEventId)
  }

  return (
    <div className={classes.calendarWrap}>
      <div className={classes.header}>
        <button onClick={prevMonth} className={classes.navBtn}>
          &larr; Prev
        </button>
        <h2 className={classes.monthLabel}>{currentMonth.format('MMMM YYYY')}</h2>
        <button onClick={nextMonth} className={classes.navBtn}>
          Next &rarr;
        </button>
      </div>

      <div className={classes.gridWrapper}>
        <div className={classes.grid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className={classes.dayHeader}>
              {d}
            </div>
          ))}

          {calendarDays.map((day, idx) => {
            const isSameMonth = day.isSame(currentMonth, 'month')
            const isToday = day.isSame(moment(), 'day')
            const dateStr = day.format('YYYY-MM-DD')

            const dayEvents = eventsByDate.get(dateStr) || []

            return (
              <div
                key={idx}
                className={`${classes.dayCell} ${!isSameMonth ? classes.disabled : ''} ${
                  isToday ? classes.today : ''
                }`}
              >
                <span className={classes.dateNum}>{day.format('D')}</span>
                <div className={classes.eventsList}>
                  {dayEvents.map((evt, eIdx) => {
                    // Check if user is interested using the event ID
                    const interested = evt.id ? isUserInterested(evt.id) : false

                    return (
                      <button
                        key={eIdx}
                        className={`
                          ${classes.eventBadge} 
                          ${evt.isJumpstart ? classes.jumpstartBg : ''} 
                          ${interested ? classes.interestedBg : ''}
                        `}
                        onClick={() => setSelectedEvent(evt)}
                      >
                        {evt.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedEvent && <div className={classes.backdrop} onClick={() => setSelectedEvent(null)} />}

      {selectedEvent && (
        <div className={classes.selectedEventOverlay}>
          <div className={classes.overlayHeader}>
            <h3>Event Details</h3>
            <button onClick={() => setSelectedEvent(null)}>Close</button>
          </div>
          <EventItem event={selectedEvent} />
        </div>
      )}
    </div>
  )
}
