'use client'

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from 'react'
import { Inter } from '@next/font/google'
import qs from 'qs'

import type { Committee, Sponsor } from '../../../payload/payload-types'
import { Page } from '../../../payload/payload-types'
import { Button } from '../../_components/Button'
import { Gutter } from '../../_components/Gutter'
import { Media as MediaComp } from '../../_components/Media'
import { Image } from '../../_components/Media/Image'
import { VerticalPadding } from '../../_components/VerticalPadding'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

type Result = {
  docs: (Sponsor | string)[]
}

type Props = Extract<Page['layout'][0], { blockType: 'homeTop' }>

export const HomeTopBlock: React.FC<
  Props & {
    id?: string
  }
> = ({ heading, image1, image2, image3 }) => {
  const [results, setResults] = useState<Result>({
    docs: []?.map(doc => doc.value),
    // hasNextPage: false,
    // hasPrevPage: false,
    // nextPage: 1,
    // page: 1,
    // prevPage: 1,
    // totalDocs: typeof populatedDocsTotal === 'number' ? populatedDocsTotal : 0,
    // totalPages: 1,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasHydrated = useRef(false)
  const isRequesting = useRef(false)

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
          limit: 20,
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

          const { docs } = json as { docs: Committee[] }

          if (docs && Array.isArray(docs)) {
            setResults(json)
            setIsLoading(false)
            // if (typeof onResultChange === 'function') {
            //   onResultChange(json)
            // }
          }
        } catch (err) {
          console.warn(err) // eslint-disable-line no-console
          setIsLoading(false)
          setError(`Unable to load "sponsor archive" data at this time.`)
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

  return (
    <VerticalPadding top="none" bottom="none">
      <div className={[classes.container, inter.className].join(' ')}>
        <div className={classes.intro}>
          <h1 className={[classes.heading, inter.className].join(' ')}>{heading}</h1>
          <Button
            label="Meet our team"
            appearance="primary"
            className={classes.button}
            href="/committee"
          />
          <div className={[classes.stats, inter.className].join(' ')}>
            <div className={classes.stat}>
              <span className={classes.number}>1000+</span>
              <span className={classes.label}>members</span>
            </div>
            <div className={classes.stat}>
              <span className={classes.number}>{results.docs?.length}</span>
              <span className={classes.label}>committee</span>
            </div>
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
