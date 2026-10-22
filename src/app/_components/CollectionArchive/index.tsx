'use client'

import React, { Fragment, useEffect, useRef, useState } from 'react'
import moment from 'moment-timezone'
import qs from 'qs'

import type {
  Committee,
  Event,
  Hackathon,
  Media,
  Post,
  Project,
  Society,
  Sponsor,
} from '../../../payload/payload-types'
import type { ArchiveBlockProps } from '../../_blocks/ArchiveBlock/types'
import { inter } from '../../_utilities/font'
import { Card } from '../Card'
import { CommitteeItem } from '../CommitteeItem'
import { CommitteePopUp } from '../CommitteePopUp'
import { EventItem } from '../EventItem'
import { Gutter } from '../Gutter'
import { HackathonItem } from '../HackathonItem'
import { Pagination } from '../Pagination'
import { SocietyItem } from '../SocietyItem'
import { SponsorItem } from '../SponsorItem'
import { EventsCalendarView } from './EventsCalendarView'
import { SubscribeDialog } from './SubscribeDialog'

import classes from './index.module.scss'

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

type Result = {
  docs: (Post | Project | Sponsor | Society | Committee | Event | Hackathon | string)[]
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
  relationTo?:
    | 'posts'
    | 'projects'
    | 'committee'
    | 'sponsors'
    | 'societies'
    | 'events'
    | 'hackathons'
  selectedDocs?: ArchiveBlockProps['selectedDocs']
  sort?: string
  isJumpstart?: boolean | null
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
    isJumpstart,
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
  const [isPopUpVisible, setIsPopUpVisible] = useState<Committee | null>(null)

  // Desktop Calendar vs Timeline View for Events
  const [useCalendarView, setUseCalendarView] = useState(false)

  const CommitteeClick = (newCommittee: Committee) => {
    setIsPopUpVisible(newCommittee)
  }

  const categories = (catsFromProps || [])
    .map(cat => (typeof cat === 'object' ? cat.id : cat))
    .join(',')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  useEffect(() => {
    let timer: NodeJS.Timeout = null

    if (populateBy === 'collection' && !isRequesting.current) {
      isRequesting.current = true

      timer = setTimeout(() => {
        if (hasHydrated.current) {
          setIsLoading(true)
        }
      }, 500)

      const searchQuery = qs.stringify(
        {
          depth: 1,
          limit:
            relationTo === 'events' || relationTo === 'societies' || relationTo === 'hackathons'
              ? 300
              : limit,
          page,
          sort:
            relationTo === 'committee'
              ? 'position'
              : relationTo === 'events'
              ? 'date'
              : relationTo === 'societies'
              ? 'name'
              : relationTo === 'hackathons'
              ? 'startDate'
              : 'level',
          where: {
            ...(categories
              ? {
                  categories: {
                    in: categories,
                  },
                }
              : {}),
            ...(relationTo === 'events' && isJumpstart
              ? {
                  isJumpstart: {
                    equals: true,
                  },
                }
              : {}),
            // Filter out sponsors that haven't been given a level so the listing
            // matches what the public detail routes serve (admin cookies must not
            // make unlevelled sponsors appear here).
            ...(relationTo === 'sponsors'
              ? {
                  level: { exists: true },
                }
              : {}),
          },
        },
        { encode: false },
      )

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
                const posA =
                  'positionRef' in a && typeof a.positionRef === 'object' && a.positionRef !== null
                    ? a.positionRef.importance
                    : Infinity
                const posB =
                  'positionRef' in b && typeof b.positionRef === 'object' && b.positionRef !== null
                    ? b.positionRef.importance
                    : Infinity

                const importanceA = typeof posA === 'number' ? posA : Infinity
                const importanceB = typeof posB === 'number' ? posB : Infinity

                return importanceA - importanceB
              })
            }

            if (relationTo === 'societies') {
              docs = shuffleArray(docs)
            }

            const nextResult = { ...json, docs } as Result
            setResults(nextResult)
            setIsLoading(false)
            if (typeof onResultChange === 'function') {
              onResultChange(nextResult)
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
  }, [page, categories, relationTo, onResultChange, sort, limit, populateBy, isJumpstart])

  const isDataReady = populateBy !== 'collection' || hasHydrated.current

  return (
    <div className={[classes.collectionArchive, className].filter(Boolean).join(' ')}>
      <div className={classes.scrollRef} ref={scrollRef} />
      {!isLoading && error && <Gutter>{error}</Gutter>}
      <Fragment>
        <Gutter
          left={relationTo === 'events' ? false : true}
          right={relationTo === 'events' ? false : true}
        >
          {relationTo === 'events' &&
            isDataReady &&
            results.docs?.filter(result => {
              if (typeof result !== 'object' || result === null || !('date' in result)) return false
              if (isJumpstart) return 'isJumpstart' in result && result.isJumpstart === true
              return new Date((result as Event).date) > today
            }).length === 0 && (
              <div className={classes.emptyState}>
                <p className={[classes.emptyHeading, inter.className].join(' ')}>
                  No events planned
                </p>
                <p className={classes.emptySubtext}>Check back soon for upcoming events.</p>
              </div>
            )}
          {relationTo === 'sponsors' && isDataReady && (results.docs?.length ?? 0) === 0 && (
            <div className={classes.emptyState}>
              <p className={[classes.emptyHeading, inter.className].join(' ')}>No sponsors yet</p>
              <p className={classes.emptySubtext}>
                Interested in sponsoring ECSS? Get in touch with us.
              </p>
            </div>
          )}
          {relationTo === 'events' ? (
            <div className={classes.eventsViewWrapper}>
              <div className={classes.viewToggleRow}>
                <span className={classes.viewTitle}></span>
                <div className={classes.toolbarActions}>
                  <div className={classes.viewButtons} role="group" aria-label="Events view">
                    <button
                      type="button"
                      aria-pressed={!useCalendarView}
                      onClick={() => setUseCalendarView(false)}
                    >
                      Timeline
                    </button>
                    <button
                      type="button"
                      aria-pressed={useCalendarView}
                      onClick={() => setUseCalendarView(true)}
                    >
                      Calendar
                    </button>
                  </div>
                  <SubscribeDialog />
                </div>
              </div>

              {(() => {
                const baseEvents = (results.docs || []).filter(result => {
                  if (typeof result !== 'object' || result === null || !('date' in result))
                    return false
                  if (isJumpstart) return 'isJumpstart' in result && result.isJumpstart === true
                  return true
                }) as Event[]

                const filteredEvents = baseEvents.filter(result => {
                  return new Date((result as Event).date) > today
                }) as Event[]

                if (useCalendarView) {
                  return <EventsCalendarView events={baseEvents} />
                }

                let lastMonthKey = ''
                const nodes: React.ReactNode[] = []

                filteredEvents.forEach((result, index) => {
                  const eventMoment = moment.utc(result.date).tz('Europe/London')
                  const monthKey = eventMoment.format('YYYY-MM')
                  const monthLabel = eventMoment.format('MMMM YYYY')

                  if (monthKey !== lastMonthKey) {
                    lastMonthKey = monthKey
                    nodes.push(
                      <div key={`month-${monthKey}`} className={classes.monthHeader}>
                        <span className={classes.monthHeaderText}>{monthLabel}</span>
                      </div>,
                    )
                  }

                  nodes.push(
                    <div
                      className={[classes.columnTimeline, classes.fadeIn].join(' ')}
                      key={`event-${index}`}
                    >
                      <EventItem event={result} />
                    </div>,
                  )
                })

                return <div className={classes.timelineGrid}>{nodes}</div>
              })()}
            </div>
          ) : relationTo === 'hackathons' ? (
            <div className={classes.eventsViewWrapper}>
              {(() => {
                const hackathons = (results.docs || []).filter(
                  (doc): doc is Hackathon =>
                    typeof doc === 'object' && doc !== null && 'type' in doc && 'startDate' in doc,
                )

                const sorted = [...hackathons].sort((a, b) => {
                  const featuredDiff = Number(Boolean(b.featured)) - Number(Boolean(a.featured))
                  if (featuredDiff !== 0) return featuredDiff
                  const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
                  return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                })

                if (isDataReady && sorted.length === 0) {
                  return (
                    <div className={classes.emptyState}>
                      <p className={[classes.emptyHeading, inter.className].join(' ')}>
                        No hackathons yet
                      </p>
                      <p className={classes.emptySubtext}>
                        Check back soon for upcoming hackathons.
                      </p>
                    </div>
                  )
                }

                return (
                  <div className={classes.hackathonGrid}>
                    {sorted.map(hackathon => (
                      <div className={classes.fadeIn} key={hackathon.id}>
                        <HackathonItem hackathon={hackathon} />
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          ) : (
            <div
              className={
                relationTo === 'committee'
                  ? classes.committeegrid
                  : relationTo === 'societies'
                  ? classes.societygrid
                  : classes.grid
              }
            >
              {results.docs
                ?.filter(result => {
                  if (!isJumpstart) return true
                  return (
                    typeof result === 'object' &&
                    result !== null &&
                    'isJumpstart' in result &&
                    result.isJumpstart === true
                  )
                })
                .map((result, index) => {
                  if (typeof result === 'object' && result !== null && relationTo !== 'committee') {
                    return (
                      <div className={[classes.column, classes.fadeIn].join(' ')} key={index}>
                        {relationTo === 'societies' && 'slug' in result && 'name' in result && (
                          <SocietyItem slug={result.slug} name={result.name} logo={result.logo} />
                        )}
                        {relationTo === 'sponsors' && 'slug' in result && 'name' in result && (
                          <SponsorItem slug={result.slug} name={result.name} logo={result.logo} />
                        )}
                      </div>
                    )
                  }
                  if (
                    typeof result === 'object' &&
                    result !== null &&
                    relationTo === 'committee' &&
                    'isCurrent' in result &&
                    result.isCurrent === true
                  ) {
                    return (
                      <div
                        className={[classes.columnCommittee, classes.fadeIn].join(' ')}
                        key={index}
                      >
                        <CommitteeItem committee={result} onCommitteeClick={CommitteeClick} />
                      </div>
                    )
                  }

                  return null
                })}
            </div>
          )}
          {results.totalPages > 1 &&
            populateBy !== 'selection' &&
            relationTo !== 'events' &&
            relationTo !== 'hackathons' && (
              <Pagination
                className={classes.pagination}
                onClick={setPage}
                page={results.page}
                totalPages={results.totalPages}
              />
            )}
        </Gutter>
      </Fragment>
      {isPopUpVisible && ('position' in isPopUpVisible || 'positionRef' in isPopUpVisible) && (
        <CommitteePopUp
          name={isPopUpVisible.firstName + ' ' + isPopUpVisible.lastName}
          role={
            (isPopUpVisible.positionRef && typeof isPopUpVisible.positionRef === 'object'
              ? isPopUpVisible.positionRef.name
              : null) ||
            isPopUpVisible.position ||
            ''
          }
          bio={isPopUpVisible.bio}
          logo={isPopUpVisible.logo}
          onCommitteeClick={CommitteeClick}
        />
      )}
    </div>
  )
}
