import React, { useState } from 'react'
import { Inter } from '@next/font/google'
import moment from 'moment-timezone'
import Image from 'next/image'
import Link from 'next/link'

import { Event, Media } from '../../../payload/payload-types'

import classes from './index.module.scss'
import { InterestedButton } from './InterestedButton'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const EventItem: React.FC<{
  event?: Event
  isNextEvent?: boolean
  onEventClick?: (event: Event | null) => void // Kept for backwards compatibility but not really needed
}> = ({ event, isNextEvent = false }) => {
  const { name, date, endTime, location, description, link, isJumpstart, image } = event || {}
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
    // concEndTime =
    //   endTimeParts[2] && endTimeParts[2].split(' ')[1]
    //     ? endTimeParts[2].split(' ')[1].split(':').slice(0, 2).join(':')
    //     : null
    concEndTime = null;
  }

  const dateString = day ? `${day} ${monthName}` : ''
  const timeString = time ? `${time}${concEndTime ? ` - ${concEndTime}` : ''}` : ''

  // Calculate "in X days"
  let daysLabel: string | null = null
  if (date) {
    const eventDate = moment.utc(date).tz('Europe/London').startOf('day')
    const todayStart = moment().tz('Europe/London').startOf('day')
    const diff = eventDate.diff(todayStart, 'days')
    if (diff === 0) daysLabel = 'Today!'
    else if (diff === 1) daysLabel = 'Tomorrow!'
    else if (diff > 1) daysLabel = `In ${diff} days`
  }

  // Resolve image URL
  let imageUrl: string | null = null
  let imageAlt: string = name || 'Event image'
  if (image && typeof image === 'object') {
    const mediaImage = image as Media
    imageUrl = mediaImage.url || null
    if (mediaImage.alt) imageAlt = mediaImage.alt
  }

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={[classes.itemWrapper, inter.className].join(' ')}>
      <div className={classes.timelineLine} />
      <div
        className={`${classes.timelineDot} ${isJumpstart ? classes.timelineDotJumpstart : ''} ${isNextEvent ? classes.timelineDotNext : ''
          }`}
      />
      <div
        className={[
          classes.contentCard,
          isJumpstart ? classes.contentCardJumpstart : '',
          isNextEvent ? classes.contentCardNext : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isNextEvent && <span className={classes.nextEventBadge}>Next Event</span>}
        {isJumpstart && <span className={classes.jumpstartBadge}>Jumpstart Event</span>}

        {imageUrl && (
          <div className={classes.imageWrapper}>
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              className={classes.eventImage}
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
        )}

        <div className={classes.cardBody}>
          <div className={classes.headerRow}>
            <div className={classes.titleArea}>
              <h2 className={classes.name}>{name}</h2>
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
                      {daysLabel && `${daysLabel} • `} {dateString} {timeString && `• ${timeString}`}
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

            <div className={classes.actionsArea}>
              {event.id && <InterestedButton eventId={event.id} initialInterestedCount={(event as any).interestedCount || 0} />}
            </div>
          </div>

          {description && (
            <div className={classes.descriptionBox}>
              <div className={!isExpanded ? classes.truncatedDesc : ''}>{description}</div>
              {event._status == 'draft' && <p>This is a Draft, it won't show for all users.</p>}
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
    </div>
  )
}
