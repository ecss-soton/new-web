'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Inter } from '@next/font/google'
import moment from 'moment-timezone'
import Link from 'next/link'
import qs from 'qs'

import type { Event } from '../../../payload/payload-types'
import { Page } from '../../../payload/payload-types'
import { Gutter } from '../../_components/Gutter'
import { Media as MediaComp } from '../../_components/Media'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

type Props = Extract<Page['layout'][0], { blockType: 'nextEvent' }>

export const NextEventBlock: React.FC<
  Props & {
    id?: string
  }
> = ({ media }) => {
  const getMonthName = (monthNumber: number): string => {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    return monthNames[monthNumber - 1]
  }

  const [docs, setDocs] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  const hasHydrated = useRef(false)
  const isRequesting = useRef(false)

  useEffect(() => {
    let timer: NodeJS.Timeout = null

    if (!isRequesting.current) {
      isRequesting.current = true

      timer = setTimeout(() => {
        if (hasHydrated.current) {
          setIsLoading(true)
        }
      }, 500)

      const searchQuery = qs.stringify(
        {
          depth: 1,
          sort: 'date',
        },
        { encode: false },
      )

      const makeRequest = async () => {
        try {
          const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/events?${searchQuery}`)
          const json = await req.json()

          clearTimeout(timer)

          if (json.docs && Array.isArray(json.docs)) {
            const today = new Date()
            const upcomingEvents = json.docs.filter(
              (res: any) => typeof res === 'object' && 'date' in res && new Date(res.date) > today,
            ) as Event[]
            setDocs(upcomingEvents)
          }
          setIsLoading(false)
        } catch (err) {
          console.warn(err) // eslint-disable-line no-console
          setIsLoading(false)
          setError(`Unable to load "events archive" data at this time.`)
        }

        isRequesting.current = false
        hasHydrated.current = true
      }

      void makeRequest()
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (isLoading) {
    return (
      <div className={classes.background}>
        {media && <MediaComp resource={media} className={classes.backgroundMedia} priority />}
        <div className={[classes.container, inter.className].join(' ')}>
          <div className={classes.text}>
            <h3 className={classes.nextEvent}>Next Event</h3>
            <h1 className={classes.title}>Loading...</h1>
          </div>
        </div>
      </div>
    )
  }

  if (docs.length > 0 && typeof docs[0] === 'object') {
    const result = docs[0]

    const date = moment.utc(result.date).tz('Europe/London').format('YYYY-MM-DD HH:mm')
    const endTime = result.endTime
      ? moment.utc(result.endTime).tz('Europe/London').format('YYYY-MM-DD HH:mm')
      : null
    let concEndTime = null

    const dateParts = date.split('-')
    const month = parseInt(dateParts[1], 10)
    const day = dateParts[2].split(' ')[0]
    const time = dateParts[2].split(' ')[1].split(':').slice(0, 2).join(':')
    const monthName = getMonthName(month)

    if (endTime) {
      const endTimeParts = endTime.split('-')
      concEndTime =
        endTimeParts[2] && endTimeParts[2].split(' ')[1]
          ? endTimeParts[2].split(' ')[1].split(':').slice(0, 2).join(':')
          : null
    }

    return (
      <div className={classes.background}>
        {media && <MediaComp resource={media} className={classes.backgroundMedia} priority />}
        {error && <Gutter>{error}</Gutter>}
        <div className={[classes.container, inter.className].join(' ')}>
          <div className={classes.text}>
            <h3 className={classes.nextEvent}>Next Event</h3>
            <h1 className={classes.title}>{result.name}</h1>
          </div>
          <div className={classes.info}>
            <div className={classes.when}>
              <div className={classes.date}>
                <span className={classes.day}>{day}</span>
                <span className={classes.month}>{monthName}</span>
              </div>
              <div className={classes.time}>
                <div className={classes.start}>
                  <span className={classes.startText}>starts</span>
                  <span className={classes.startTime}>{time}</span>
                  <span className={classes.startText}>ends</span>
                  <span className={classes.startTime}>{concEndTime}</span>
                </div>
              </div>
            </div>
            <div className={classes.moreInfo}>
              <Link href="/events" className={classes.link}>
                see more &gt;
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback state (No Events)
  return (
    <div className={classes.background}>
      {media && <MediaComp resource={media} className={classes.backgroundMedia} priority />}
      {error && <Gutter>{error}</Gutter>}
      <div className={[classes.container, inter.className].join(' ')}>
        <div className={classes.text}>
          <h3 className={classes.nextEvent}>Next Event</h3>
          <h1 className={classes.title}>No Events Found</h1>
        </div>
        <div className={classes.info}>
          <div className={classes.moreInfo}>
            <Link href="/events" className={classes.link}>
              see all events &gt;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
