import React from 'react'
import moment from 'moment-timezone'

import type { Event } from '../../../../payload/payload-types'
import { Media } from '../../../_components/Media'
import { inter } from '../../../_utilities/font'

import classes from './index.module.scss'

type Props = {
  event: Event
}

const TIMEZONE = 'Europe/London'

const formatTime = (dateStr: string): string => {
  return moment.utc(dateStr).tz(TIMEZONE).format('HH:mm')
}

const formatTimeRange = (startDate: string, endTime?: string | null): string => {
  const start = formatTime(startDate)
  if (!endTime) return start
  const end = formatTime(endTime)
  return `${start} – ${end}`
}

export const JumpstartEventCard: React.FC<Props> = ({ event }) => {
  const { name, date, endTime, location, description, mapsUrl, image } = event

  const timeRange = formatTimeRange(date, endTime)

  return (
    <div className={[classes.card, inter.className].join(' ')}>
      {image && typeof image !== 'string' && (
        <div className={classes.imageColumn}>
          <Media resource={image} className={classes.image} imgClassName={classes.imageImg} />
        </div>
      )}
      <div className={classes.content}>
        <div className={classes.meta}>
          <span className={classes.time}>{timeRange}</span>
        </div>
        <h3 className={classes.title}>{name}</h3>
        {location && (
          <p className={classes.location}>
            <svg
              className={classes.locationIcon}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location}
          </p>
        )}
        {description && <p className={classes.description}>{description}</p>}
        <div className={classes.actions}>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={classes.mapsButton}
            >
              Get me there →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
