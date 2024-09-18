'use client'

import React from 'react'
import { Inter } from '@next/font/google'
import Link from 'next/link'

import { Event } from '../../../payload/payload-types'
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
  onEventClick: (event: Event | null) => void
}

export const EventPopUp: React.FC<PopUpProps> = ({
  name,
  date,
  location,
  description,
  endTime,
  onEventClick,
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

  const dateParts = date.split('-')
  const year = dateParts[0]
  const month = parseInt(dateParts[1], 10)
  const day = dateParts[2].split('T')[0]
  const monthName = getMonthName(month)
  const time = dateParts[2].split('T')[1].split(':').slice(0, 2).join(':')
  let concEndTime: string | null = null
  if (endTime) {
    const endTimeParts = endTime.split('-')
    concEndTime = endTimeParts[2].split('T')[1].split(':').slice(0, 2).join(':')
  }
  return (
    <>
      <div className={[classes.background, inter.className].join(' ')} onClick={closeClick} />
      <div className={classes.rectangle}>
        <Link onClick={closeClick} className={classes.close} href={''}></Link>
        <div className={classes.info}>
          <div className={classes.when}>
            <div className={classes.date}>{day}</div>
            <div className={classes.month}>{monthName}</div>
            {endTime ? (
              <span className={classes.time}>{time + ' - ' + concEndTime}</span>
            ) : (
              <span className={classes.time}>{time}</span>
            )}
          </div>
          <div className={classes.bits}>
            <span className={classes.name}>{name}</span>
            <span className={classes.role}>{location}</span>
          </div>
        </div>
        {description && <p className={classes.bio}>{description}</p>}
      </div>
    </>
  )
}
