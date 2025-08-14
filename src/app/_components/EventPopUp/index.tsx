'use client'

import React from 'react'
import { Inter } from '@next/font/google'
import moment from 'moment'
import Link from 'next/link'

import type { Event as EventType, Media as MediaType } from '../../../payload/payload-types'
import { Button } from '../Button'
import { Media } from '../Media'
import RichText from '../RichText'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

interface PopUpProps {
  name: string
  date: string
  location: string | null
  description: string | null
  endTime: string | null
  link: string | null
  image?: string | MediaType | null
  onEventClick: (event: any) => void
}

export const EventPopUp: React.FC<PopUpProps> = ({
  name,
  date,
  location,
  description,
  endTime,
  link,
  onEventClick,
  image,
}) => {
  const closeClick = () => {
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
  return (
    <>
      <div className={[classes.background, inter.className].join(' ')} onClick={closeClick} />
      <div className={classes.rectangle}>
        {/* <Link onClick={closeClick} className={classes.close} href={''}></Link> */}
        <div className={classes.info}>
          <div className={classes.infoText}>
            <div className={classes.when}>
              <div className={classes.date}>{day}</div>
              <div className={classes.month}>{monthName}</div>
              {endTime ? (
                <span className={classes.time}>{time + ' - ' + concEndTime}</span>
              ) : (
                <span className={classes.time}>{time}</span>
              )}
              <span className={classes.role}>{location}</span>
            </div>
            <div className={classes.bits}>
              <span className={classes.name}>{name}</span>
            </div>
          </div>
          {image && <Media resource={image} className={classes.media}></Media>}
        </div>
        {description && <p className={classes.bio}>{description}</p>}
        {link && (
          <Button label="Event Link" appearance="primary" className={classes.button} href={link} />
        )}
      </div>
    </>
  )
}
