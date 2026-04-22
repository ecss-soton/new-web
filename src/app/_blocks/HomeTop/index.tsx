'use client'

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from 'react'
import { Inter } from '@next/font/google'
import qs from 'qs'

import Link from 'next/link'

import type { Committee, Society, Sponsor } from '../../../payload/payload-types'
import { Page } from '../../../payload/payload-types'
import { Image } from '../../_components/Media/Image'
import { VerticalPadding } from '../../_components/VerticalPadding'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

type Result = {
  docs: (Sponsor | Committee | Society | string)[]
  totalDocs?: number
}

type Props = Extract<Page['layout'][0], { blockType: 'homeTop' }>

export const HomeTopBlock: React.FC<
  Props & {
    id?: string
  }
> = ({ heading, image1, image2, image3 }) => {
  const [results, setResults] = useState<Result>({
    docs: [],
    totalDocs: 0,
  })

  const [membersCount, setMembersCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
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
          limit: 0, // We only need the totalDocs count
          where: { isCurrent: { equals: true } },
        },
        { encode: false },
      )

      const makeRequest = async () => {
        try {
          const req = await fetch(
            `${process.env.NEXT_PUBLIC_SERVER_URL}/api/committee?${searchQuery}`,
          )

          const json = await req.json()
          clearTimeout(timer)

          setResults(json)

          // Fetch members count (users with susu role)
          const membersReq = await fetch(
            `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/count-susu-members`,
          )

          const membersJson = await membersReq.json()
          const { susuCount } = membersJson as { susuCount: number }

          if (typeof susuCount === 'number') {
            setMembersCount(susuCount)
          }

          setIsLoading(false)
        } catch (err) {
          console.warn(err) // eslint-disable-line no-console
          setIsLoading(false)
          setError(`Unable to load stats data at this time.`)
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

  const committeeCount = results.totalDocs || 0
  const displayedMembersCount = Math.max(500, Math.floor(membersCount / 10) * 10)

  // Dynamically highlight standard ECSS terminology within the CMS string
  const renderDynamicHeading = (text: string) => {
    if (!text) return null
    const regex = /(Electronics and Computer Science Society|ECSS)/gi
    const parts = text.split(regex)
    return parts.map((part, i) => {
      // Check if this part matches our emphasis keywords
      if (part.toLowerCase() === 'electronics and computer science society' || part.toLowerCase() === 'ecss') {
        return (
          <strong key={i} className={classes.gradientHighlight}>
            {part}
          </strong>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <VerticalPadding top="none" bottom="none">
      <div className={[classes.container, inter.className].join(' ')}>
        <div className={classes.intro}>
          <div className={classes.heroTitles}>
            <h1 className={[classes.heading, inter.className].join(' ')}>
              {renderDynamicHeading(heading)}
            </h1>
          </div>
          <div className={[classes.stats, inter.className].join(' ')}>
            <Link href="/societies" className={classes.stat}>
              <span className={classes.number}>{isLoading ? '...' : `${displayedMembersCount}+`}</span>
              <span className={classes.label}>members</span>
            </Link>
            <Link href="/committee" className={classes.stat}>
              <span className={classes.number}>{isLoading ? '...' : committeeCount}</span>
              <span className={classes.label}>committee</span>
            </Link>
          </div>
        </div>
        <div className={classes.imageContainer}>
          <Image resource={image1} alt="Image 1" imgClassName={classes.image1} />
          <Image resource={image2} alt="Image 2" imgClassName={classes.image2} />
          <Image resource={image3} alt="Image 3" imgClassName={classes.image3} />
        </div>
      </div>
    </VerticalPadding>
  )
}
