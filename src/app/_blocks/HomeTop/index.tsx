'use client'

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import qs from 'qs'

import type { Committee, Society, Sponsor } from '../../../payload/payload-types'
import { Page } from '../../../payload/payload-types'
import { Media } from '../../_components/Media'
import { inter } from '../../_utilities/font'

import classes from './index.module.scss'

type Result = {
  docs: (Sponsor | Committee | Society | string)[]
  totalDocs?: number
}

type Props = Extract<Page['layout'][0], { blockType: 'homeTop' }>

export const HomeTopBlock: React.FC<
  Props & {
    id?: string
  }
> = ({ heading, image1, show_on_mobile }) => {
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
          limit: 0,
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

  const committeeCount = results.totalDocs || 16
  const displayedMembersCount = Math.max(500, Math.floor(membersCount / 10) * 10)

  const renderDynamicHeading = (text: string) => {
    if (!text) return null
    const regex = /(Electronics and Computer Science Society|ECSS)/gi
    const parts = text.split(regex)
    return parts.map((part, i) => {
      if (
        part.toLowerCase() === 'electronics and computer science society' ||
        part.toLowerCase() === 'ecss'
      ) {
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
    <div
      className={[classes.background]
        .join(' ')
        .trim()}
    >
      {image1 && <Media resource={image1} className={classes.backgroundMedia} priority />}
      {error && <p>{error}</p>}
      <div className={[classes.container, inter.className].join(' ')}>
        <div className={classes.intro}>
          <div className={classes.heroTitles}>
            <h1 className={[classes.heading, inter.className].join(' ')}>
              {renderDynamicHeading(heading)}
            </h1>
          </div>
          <div className={[classes.buttons, inter.className].join(' ')}>
            <Link href="/societies" className={classes.button}>
              <span className={classes.buttonNumber}>
                {isLoading ? '...' : `${displayedMembersCount}+`}
              </span>
              <span className={classes.buttonLabel}>members</span>
            </Link>
            <Link href="/committee" className={classes.button}>
              <span className={classes.buttonNumber}>
                {isLoading ? '...' : committeeCount}
              </span>
              <span className={classes.buttonLabel}>committee</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
