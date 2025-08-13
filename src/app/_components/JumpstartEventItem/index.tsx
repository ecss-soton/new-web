import React from 'react'
import { Inter } from '@next/font/google'
import Image from 'next/image'
import Link from 'next/link'

import { JumpstartEvent, Media } from '../../../payload/payload-types'
import { Media as MediaComp } from '../Media'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const JumpstartEventItem: React.FC<{
  jumpstartEvent?: JumpstartEvent
}> = ({ jumpstartEvent }) => {
  const { title, description, image, link, date, endTime, location } = jumpstartEvent || {}

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

  const truncateDescription = (description: string, maxLength: number) => {
    if (!description) return ''
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + '...'
    }
    return description
  }

  // Safe date parsing with null checks
  let dateInfo = null
  if (date) {
    try {
      const dateParts = date.split('-')
      if (dateParts.length >= 3) {
        const year = dateParts[0]
        const month = parseInt(dateParts[1], 10)
        const dayPart = dateParts[2].split('T')[0]
        const monthName = getMonthName(month)
        // Safe time extraction
        let time = ''
        if (dateParts[2].includes(' ')) {
          const timePart = dateParts[2].split(' ')[1]
          if (timePart) {
            time = timePart.split(':').slice(0, 2).join(':')
          }
        }
        dateInfo = { day: dayPart, monthName, time }
      }
    } catch (error) {
      // Silently handle date parsing errors
    }
  }

  const truncatedDesc = description ? truncateDescription(description, 150) : ''

  return (
    <div className={[classes.card].filter(Boolean).join(' ')}>
      <div className={classes.mediaWrapper}>
        {!image && <div className={classes.placeholder}>No image</div>}
        {image && typeof image !== 'string' && (
          <MediaComp imgClassName={classes.image} resource={image} fill />
        )}
      </div>
      <div className={classes.content}>
        {title && <h4 className={[classes.title, inter.className].join(' ')}>{title}</h4>}
        {description && <p>{truncatedDesc}</p>}
        {location && (
          <div className={classes.iconLine}>
            <Image src="/location-pin-svgrepo-com.svg" alt="location icon" width={16} height={16} />
            <span>{location}</span>
          </div>
        )}
        {dateInfo && (
          <div className={classes.iconLine}>
            <Image src="/calendar-svgrepo-com.svg" alt="calander icon" width={16} height={16} />
            <span>{dateInfo.day + ' ' + dateInfo.monthName + ' ' + dateInfo.time}</span>
          </div>
        )}
        {link && (
          <div className={classes.iconLine}>
            <Image src="/link-svgrepo-com.svg" alt="link icon" width={16} height={16} />
            <Link href={link}>{link}</Link>
          </div>
        )}
      </div>
    </div>
  )
}
