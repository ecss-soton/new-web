import React from 'react'
import { Inter } from '@next/font/google'
import moment from 'moment'
import Image from 'next/image'
import Link from 'next/link'

import { Event, Media } from '../../../payload/payload-types'
import { Media as MediaComp } from '../Media'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

// Conversion function to transform JumpstartEvent to Event
// const convertJumpstartEventToEvent = (jumpstartEvent: JumpstartEvent): Event => {
//   return {
//     id: jumpstartEvent.id,
//     name: jumpstartEvent.title, // Map title to name
//     date: jumpstartEvent.date,
//     endTime: jumpstartEvent.endTime,
//     location: jumpstartEvent.location,
//     description: jumpstartEvent.description,
//     link: jumpstartEvent.link,
//     updatedAt: jumpstartEvent.updatedAt,
//     createdAt: jumpstartEvent.createdAt,
//   }
// }

export const JumpstartEventItem: React.FC<{
  event?: Event
  onEventClick: (event: Event | null, image?: string | Media | null) => void
}> = ({ event, onEventClick }) => {
  const { name, description, image, link, date, endTime, location } = event || {}

  const handleClick = () => {
    onEventClick(event)
  }

  const handleClose = () => {
    onEventClick(null)
  }

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

  const localDate = moment.utc(date).tz('Europe/London').format('YYYY-MM-DD HH:mm')
  const localEndTime = moment.utc(endTime).tz('Europe/London').format('YYYY-MM-DD HH:mm')
  let concEndTime = null

  const truncateDescription = (description: string, maxLength: number) => {
    if (!description) return ''
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + '...'
    }
    return description
  }

  const dateParts = localDate.split('-')
  const year = dateParts[0]
  const month = parseInt(dateParts[1], 10)
  const day = dateParts[2].split(' ')[0]
  const time = dateParts[2].split(' ')[1].split(':').slice(0, 2).join(':')
  const monthName = getMonthName(month)
  if (localEndTime) {
    const endTimeParts = localEndTime.split('-')
    concEndTime = endTimeParts[2].split(' ')[1].split(':').slice(0, 2).join(':')
  }

  // console.log(dateInfo)

  const truncatedDesc = description ? truncateDescription(description, 150) : ''

  return (
    <div className={[classes.card].filter(Boolean).join(' ')} onClick={handleClick}>
      <div className={classes.mediaWrapper}>
        {!image && <div className={classes.placeholder}>No image</div>}
        {image && typeof image !== 'string' && (
          <MediaComp imgClassName={classes.image} resource={image} fill />
        )}
      </div>
      <div className={classes.content}>
        {name && <h4 className={[classes.title, inter.className].join(' ')}>{name}</h4>}
        {/* {description && <p>{truncatedDesc}</p>} */}
        {location && (
          <div className={classes.iconLine}>
            <Image src="/location-pin-svgrepo-com.svg" alt="location icon" width={16} height={16} />
            <span className={classes.linkSpan}>{location}</span>
          </div>
        )}
        {date && (
          <div className={classes.iconLine}>
            <Image src="/calendar-svgrepo-com.svg" alt="calander icon" width={16} height={16} />
            <span className={classes.linkSpan}>
              {day + ' ' + monthName + ' ' + time + '-' + (endTime ? concEndTime : '')}
            </span>
          </div>
        )}
        {link && (
          <div className={classes.iconLine}>
            <Image src="/link-svgrepo-com.svg" alt="link icon" width={16} height={16} />
            <Link className={classes.linkSpan} href={link}>
              {link}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
