'use client'

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import qs from 'qs'

import type {
  Committee,
  Event,
  Post,
  Project,
  Society,
  Sponsor,
} from '../../../payload/payload-types'
import type { ArchiveBlockProps } from '../../_blocks/ArchiveBlock/types'
import { Card } from '../Card'
import { CommitteeItem } from '../CommitteeItem'
import { EventItem } from '../EventItem'
import { Gutter } from '../Gutter'
import { PageRange } from '../PageRange'
import { Pagination } from '../Pagination'
import { SocietyItem } from '../SocietyItem'
import { SponsorItem } from '../SponsorItem'

import classes from './index.module.scss'

type Result = {
  docs: (Post | Project | Sponsor | Society | Committee | Event | string)[]
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number
  page: number
  prevPage: number
  totalDocs: number
  totalPages: number
}

export type Props = {
  categories?: ArchiveBlockProps['categories']
  className?: string
  limit?: number
  onResultChange?: (result: Result) => void // eslint-disable-line no-unused-vars
  populateBy?: 'collection' | 'selection'
  populatedDocs?: ArchiveBlockProps['populatedDocs']
  populatedDocsTotal?: ArchiveBlockProps['populatedDocsTotal']
  relationTo?: 'posts' | 'projects' | 'committee' | 'sponsors' | 'societies' | 'events'
  selectedDocs?: ArchiveBlockProps['selectedDocs']
  showPageRange?: boolean
  sort?: string
}

export const CollectionArchive: React.FC<Props> = props => {
  const {
    categories: catsFromProps,
    className,
    limit,
    onResultChange,
    populateBy,
    populatedDocs,
    populatedDocsTotal,
    relationTo,
    selectedDocs,
    showPageRange,
    sort = '-createdAt',
  } = props

  const [results, setResults] = useState<Result>({
    // @ts-ignore
    docs: (populateBy === 'collection'
      ? populatedDocs
      : populateBy === 'selection'
      ? selectedDocs
      : []
    )?.map(doc => doc.value),
    hasNextPage: false,
    hasPrevPage: false,
    nextPage: 1,
    page: 1,
    prevPage: 1,
    totalDocs: typeof populatedDocsTotal === 'number' ? populatedDocsTotal : 0,
    totalPages: 1,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasHydrated = useRef(false)
  const isRequesting = useRef(false)
  const [page, setPage] = useState(1)

  const categories = (catsFromProps || [])
    .map(cat => (typeof cat === 'object' ? cat.id : cat))
    .join(',')

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

    if (populateBy === 'collection' && !isRequesting.current) {
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
          limit,
          page,
          sort:
            relationTo === 'committee' ? 'position' : relationTo === 'events' ? 'date' : 'level',
          where: {
            ...(categories
              ? {
                  categories: {
                    in: categories,
                  },
                }
              : {}),
          },
        },
        { encode: false },
      )

      const societyPositionOrder = [
        'President',
        'Vice President',
        'Vice President Engagement',
        'Vice President Operations',
        'Secretary',
        'Treasurer',
        'Events Officer',
        'Welfare Officer',
        'Web Officer',
        'Social Secretary',
        'Sports Officer',
        'Marketing Officer',
        'Hackathon Officer',
        'Industry Officer',
        'Academic Secretary',
        'Gamesmaster',
        'Games Officer',
        'International Representative',
        'Masters Rep',
        'Postgraduate Representative',
        'Publicity Officer',
        'Sports Representative',
        'Staff Representative',
        'Unknown Role',
        'Webmaster',
      ]

      const makeRequest = async () => {
        try {
          const req = await fetch(
            `${process.env.NEXT_PUBLIC_SERVER_URL}/api/${relationTo}?${searchQuery}`,
          )

          const json = await req.json()
          clearTimeout(timer)

          let { docs } = json as {
            docs: (Post | Project | Committee | Sponsor | Society | Event)[]
          }

          if (docs && Array.isArray(docs)) {
            if (relationTo === 'committee') {
              docs = docs.sort((a, b) => {
                const posA = 'position' in a ? a.position : ''
                const posB = 'position' in b ? b.position : ''
                return societyPositionOrder.indexOf(posA) - societyPositionOrder.indexOf(posB)
              })
            }

            setResults(json)
            setIsLoading(false)
            if (typeof onResultChange === 'function') {
              onResultChange(json)
            }
          }
        } catch (err) {
          console.warn(err) // eslint-disable-line no-console
          setIsLoading(false)
          setError(`Unable to load "${relationTo} archive" data at this time.`)
        }

        isRequesting.current = false
        hasHydrated.current = true
      }

      void makeRequest()
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [page, categories, relationTo, onResultChange, sort, limit, populateBy])

  return (
    <div className={[classes.collectionArchive, className].filter(Boolean).join(' ')}>
      <div className={classes.scrollRef} ref={scrollRef} />
      {!isLoading && error && <Gutter>{error}</Gutter>}
      <Fragment>
        {/* {showPageRange !== false && populateBy !== 'selection' && (
          <Gutter>
            <div className={classes.pageRange}>
              <PageRange
                collection={relationTo}
                currentPage={results.page}
                limit={limit}
                totalDocs={results.totalDocs}
              />
            </div>
          </Gutter>
        )} */}
        <Gutter>
          <div
            className={
              relationTo === 'committee' || relationTo === 'events'
                ? classes.committeegrid
                : classes.grid
            }
          >
            {results.docs?.map((result, index) => {
              if (typeof result === 'object' && result !== null) {
                return (
                  <div
                    className={[
                      relationTo === 'committee'
                        ? classes.columnCommittee
                        : relationTo === 'events'
                        ? classes.columnEvents
                        : classes.column,
                      classes.fadeIn,
                    ].join(' ')}
                    key={index}
                  >
                    {/* {relationTo == ('projects' || 'posts' || 'committee') && (
                      <Card doc={result} relationTo={relationTo} showCategories />
                    )} */}
                    {relationTo === 'societies' && 'slug' in result && 'name' in result && (
                      <SocietyItem slug={result.slug} name={result.name} logo={result.logo} />
                      // TODO: Fix scuffed typing fix here.
                    )}
                    {relationTo === 'sponsors' && 'slug' in result && 'name' in result && (
                      <SponsorItem slug={result.slug} name={result.name} logo={result.logo} />
                    )}
                    {relationTo === 'committee' && 'position' in result && (
                      <CommitteeItem committee={result} />
                    )}
                    {relationTo === 'events' && 'name' in result && 'date' in result && (
                      <EventItem event={result} />
                    )}
                  </div>
                )
              }

              return null
            })}
          </div>
          {results.totalPages > 1 && populateBy !== 'selection' && (
            <Pagination
              className={classes.pagination}
              onClick={setPage}
              page={results.page}
              totalPages={results.totalPages}
            />
          )}
        </Gutter>
      </Fragment>
    </div>
  )
}
