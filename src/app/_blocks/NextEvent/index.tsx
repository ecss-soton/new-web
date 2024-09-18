'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Inter } from '@next/font/google'
import { StaticImageData } from 'next/image'
import Link from 'next/link'
import qs from 'qs'

import type { Event } from '../../../payload/payload-types'
import { Page } from '../../../payload/payload-types'
import { Gutter } from '../../_components/Gutter'
import { Media as MediaComp } from '../../_components/Media'
import { Image } from '../../_components/Media/Image'
import RichText from '../../_components/RichText'
import { VerticalPadding } from '../../_components/VerticalPadding'

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
  let src: string | StaticImageData | ''
  let width: number | undefined
  let height: number | undefined

  if (!src && media && typeof media !== 'string') {
    const {
      width: fullWidth,
      height: fullHeight,
      filename: fullFilename,
      alt: altFromResource,
    } = media

    const filename = fullFilename

    src = `${process.env.NEXT_PUBLIC_SERVER_URL}/media/${filename}`
  }

  const backgroundStyle: React.CSSProperties = {
    width: '100%',
    zIndex: '-1',
    backgroundImage: `url(${src})`,
    objectFit: 'cover',
  }

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

  const eventExample = {
    id: 'fuckme',
    name: 'No Events',
    date: '2024-12-02T22:00:00.000+00:00',
    location: 'bong',
    description: 'bing',
    updatedAt: '2024-09-06T20:41:28.760+00:00',
    createdAt: '2024-09-06T20:41:28.760+00:00',
  } as Event

  type Result = {
    docs: (Event | string)[]
    hasNextPage: boolean
    hasPrevPage: boolean
    nextPage: number
    page: number
    prevPage: number
    totalDocs: number
    totalPages: number
  }

  const [results, setResults] = useState<Result>({
    docs: [eventExample],
    hasNextPage: false,
    hasPrevPage: false,
    nextPage: 1,
    page: 1,
    prevPage: 1,
    totalDocs: 10,
    totalPages: 1,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasHydrated = useRef(false)
  const isRequesting = useRef(false)
  const [page, setPage] = useState(1)

  const scrollToRef = useCallback(() => {
    const { current } = scrollRef
    if (current) {
      // current.scrollIntoView({
      //   behavior: 'smooth',
      // })
    }
  }, [])

  useEffect(() => {
    if (!isLoading && typeof results.page !== 'undefined') {
      // scrollToRef()
    }
  }, [isLoading, scrollToRef, results])

  useEffect(() => {
    let timer: NodeJS.Timeout = null

    if (!isRequesting.current) {
      isRequesting.current = true

      // hydrate the block with fresh content after first render
      // don't show loader unless the request takes longer than x ms
      // and don't show it during initial hydration
      timer = setTimeout(() => {
        if (hasHydrated.current) {
          setIsLoading(true)
        }
      }, 500)

      const searchQuery = qs.stringify(
        {
          depth: 1,
          limit: 1,
          sort: '-date',
        },
        { encode: false },
      )

      const makeRequest = async () => {
        try {
          const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/events?${searchQuery}`)

          const json = await req.json()
          clearTimeout(timer)

          let { docs } = json as {
            docs: Event[]
          }

          if (docs && Array.isArray(docs)) {
            setResults(json)
            setIsLoading(false)
          }
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
  }, [page])

  if (typeof results.docs[0] === 'object') {
    const result = results.docs[0]

    const date = result.date

    const dateParts = date.split('-')
    const year = dateParts[0]
    const month = parseInt(dateParts[1], 10)
    const day = dateParts[2].split('T')[0]
    const time = dateParts[2].split('T')[1].split(':').slice(0, 2).join(':')
    const monthName = getMonthName(month)

    return (
      <div style={backgroundStyle} className={classes.background}>
        {!isLoading && error && <Gutter>{error}</Gutter>}
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
                </div>
              </div>
            </div>
            <div className={classes.moreInfo}>
              <Link href="/events" className={classes.link}>
                more info &gt;
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
