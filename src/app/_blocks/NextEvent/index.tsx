'use client'

import React, { useEffect, useRef, useState } from 'react'
import moment from 'moment-timezone'
import Link from 'next/link'
import qs from 'qs'

import type { Event } from '../../../payload/payload-types'
import { Page } from '../../../payload/payload-types'
import { Gutter } from '../../_components/Gutter'
import { Media as MediaComp } from '../../_components/Media'
import { inter } from '../../_utilities/font'
import { getMonthName } from '../../_utilities/getMonthName'

import classes from './index.module.scss'

type Props = Extract<Page['layout'][0], { blockType: 'nextEvent' }>

export const NextEventBlock: React.FC<
  Props & {
    id?: string
  }
> = ({ media }) => {
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

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const searchQuery = qs.stringify(
        {
          depth: 1,
          limit: 50,
          sort: 'date',
          where: {
            date: {
              greater_than_equal: todayStart.toISOString(),
            },
          },
        },
        { encode: false },
      )

      const makeRequest = async () => {
        try {
          const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/events?${searchQuery}`)
          const json = await req.json()

          clearTimeout(timer)

          if (json.docs && Array.isArray(json.docs)) {
            const now = new Date()
            const upcomingEvents = json.docs.filter((res: any) => {
              if (typeof res !== 'object' || !('date' in res)) return false
              if (res.endTime && new Date(res.endTime) <= now) return false
              return true
            }) as Event[]
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
    const eventImage = result.image && typeof result.image !== 'string' ? result.image : undefined

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

    // Calculate today/tomorrow/now labels
    let dayLabel = day
    let monthLabel = monthName
    let isNow = false
    let isSpecialDay = false

    if (result.date) {
      const eventDate = moment.utc(result.date).tz('Europe/London').startOf('day')
      const todayStart = moment().tz('Europe/London').startOf('day')
      const diff = eventDate.diff(todayStart, 'days')

      // Check if event is happening right now
      const nowMoment = moment().tz('Europe/London')
      const startMoment = moment.utc(result.date).tz('Europe/London')
      const endMoment = result.endTime
        ? moment.utc(result.endTime).tz('Europe/London')
        : startMoment.clone().add(1, 'hour')

      if (nowMoment.isSameOrAfter(startMoment) && nowMoment.isBefore(endMoment)) {
        isNow = true
        dayLabel = 'Now'
        monthLabel = `${day} ${monthName}`
        isSpecialDay = true
      } else if (diff === 0) {
        dayLabel = 'Today'
        monthLabel = `${day} ${monthName}`
        isSpecialDay = true
      } else if (diff === 1) {
        dayLabel = 'Tomorrow'
        monthLabel = `${day} ${monthName}`
        isSpecialDay = true
      }
    }

    const bgResource = eventImage || media

    return (
      <div className={classes.background}>
        {bgResource && (
          <MediaComp resource={bgResource} className={classes.backgroundMedia} priority />
        )}
        {error && <Gutter>{error}</Gutter>}
        <div className={[classes.container, inter.className].join(' ')}>
          <div className={classes.text}>
            <h3 className={classes.nextEvent}>Next Event</h3>
            <h1 className={classes.title}>{result.name}</h1>
          </div>
          <div className={classes.info}>
            <div className={classes.when}>
              <div className={classes.date}>
                <span
                  className={[
                    classes.day,
                    isNow ? classes.dayNow : '',
                    isSpecialDay && !isNow ? classes.dayLabel : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {dayLabel}
                </span>
                {monthLabel && <span className={classes.month}>{monthLabel}</span>}
              </div>
              <div className={classes.time}>
                <div className={classes.start}>
                  {isNow ? (
                    <span className={classes.startNow}>Happening now</span>
                  ) : (
                    <>
                      <span className={classes.startText}>starts</span>
                      <span className={classes.startTime}>{time}</span>
                      {concEndTime && (
                        <>
                          <span className={classes.startText}>ends</span>
                          <span className={classes.startTime}>{concEndTime}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <Link href="/events" className={[classes.moreInfo, classes.link].join(' ')}>
              See all events →
            </Link>
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
          <Link href="/events" className={[classes.moreInfo, classes.link].join(' ')}>
            See all events →
          </Link>
        </div>
      </div>
    </div>
  )
}
