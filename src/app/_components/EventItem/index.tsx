import React, { useState } from 'react'
import { Inter } from '@next/font/google'
import moment from 'moment-timezone'
import Image from 'next/image'
import Link from 'next/link'

import { Event } from '../../../payload/payload-types'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const EventItem: React.FC<{
  event?: Event
  onEventClick?: (event: Event | null) => void // Kept for backwards compatibility but not really needed
}> = ({ event }) => {
  const { name, date, endTime, location, description, link, isJumpstart } = event || {}
  const [isExpanded, setIsExpanded] = useState(false)

  const getMonthName = (monthNumber: number): string => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return monthNames[monthNumber - 1]
  }

  const localDate = date ? moment.utc(date).tz('Europe/London').format('YYYY-MM-DD HH:mm') : null
  const localEndTime = endTime
    ? moment.utc(endTime).tz('Europe/London').format('YYYY-MM-DD HH:mm')
    : null
  let concEndTime = null

  const dateParts = localDate ? localDate.split('-') : []
  const year = dateParts[0] ?? ''
  const month = dateParts[1] ? parseInt(dateParts[1], 10) : 0
  const day = dateParts[2] ? dateParts[2].split(' ')[0] : ''
  const time =
    dateParts[2] && dateParts[2].split(' ')[1]
      ? dateParts[2].split(' ')[1].split(':').slice(0, 2).join(':')
      : ''
  const monthName = month ? getMonthName(month) : ''

  if (localEndTime) {
    const endTimeParts = localEndTime.split('-')
    concEndTime =
      endTimeParts[2] && endTimeParts[2].split(' ')[1]
        ? endTimeParts[2].split(' ')[1].split(':').slice(0, 2).join(':')
        : null
  }

  const dateString = day ? `${day} ${monthName} ${year}` : ''
  const timeString = time ? `${time}${concEndTime ? ` - ${concEndTime}` : ''}` : ''

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={[classes.itemWrapper, inter.className].join(' ')}>
      <div className={classes.timelineLine} />
      <div
        className={`${classes.timelineDot} ${isJumpstart ? classes.timelineDotJumpstart : ''}`}
      />
      <div className={`${classes.contentCard} ${isJumpstart ? classes.contentCardJumpstart : ''}`}>
        {isJumpstart && <span className={classes.jumpstartBadge}>Jumpstart Event</span>}
        <div className={classes.headerRow}>
          <div className={classes.titleArea}>
            <h3 className={classes.name}>{name}</h3>
            <div className={classes.detailsList}>
              {dateString && (
                <div className={classes.detailItem}>
                  <Image
                    src="/calendar-svgrepo-com.svg"
                    alt="calendar"
                    width={16}
                    height={16}
                    className={classes.detailIcon}
                  />
                  <span>
                    {dateString} {timeString && `• ${timeString}`}
                  </span>
                </div>
              )}
              {location && (
                <div className={classes.detailItem}>
                  <Image
                    src="/location-pin-svgrepo-com.svg"
                    alt="location"
                    width={16}
                    height={16}
                    className={classes.detailIcon}
                  />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {description && (
          <div className={classes.descriptionBox}>
            <div className={!isExpanded ? classes.truncatedDesc : ''}>{description}</div>
            {description.length > 150 && (
              <button className={classes.expandButton} onClick={toggleExpand}>
                {isExpanded ? 'Show Less' : 'Read More'}
              </button>
            )}
          </div>
        )}

        {link && (
          <div className={classes.actions}>
            <Link
              href={link}
              className={classes.linkButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              Event Link
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
