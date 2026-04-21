'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import qs from 'qs'
ChartJS.register(CategoryScale, LinearScale, Tooltip, BarElement)

import { Election, ElectionResult, Nomination, User } from '../../../payload/payload-types'
import { Button } from '../Button'
import { buildOptions } from './options'

import classes from './index.module.scss'

// Mobile breakpoint — keep in sync with queries.scss $breakpoint-s-width
const MOBILE_BREAKPOINT = 768

function lineSplitter(input: string, maxLength: number): string[] {
  const words = input.split(' ')
  const lines: string[] = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    if (currentLine.length + words[i].length + 1 <= maxLength) {
      currentLine += ' ' + words[i]
    } else {
      lines.push(currentLine)
      currentLine = words[i]
    }
  }
  lines.push(currentLine)
  return lines
}

function splitNames(nomination: Nomination | null): string[] {
  if (!nomination) {
    return lineSplitter('Re-Open Nominations', 15)
  }
  return (nomination.populatedNominees ?? []).reduce((arr, n) => {
    arr.push(...lineSplitter(n.name, 14))
    return arr
  }, [])
}

function getName(nominee: Nomination | null): string {
  if (!nominee) {
    return 'Re-Open Nominations'
  }
  const nomineeNames = (nominee.populatedNominees ?? []).map(n => n.name).join(' & ')
  const nickname = nominee.nickname
  return nickname ? `${nickname} - ${nomineeNames}` : `${nomineeNames}`
}

export const ElectionResults: React.FC<{
  positionId?: string
  election?: Election
  user?: User
}> = props => {
  const { positionId, election, user } = props

  const [result, setResult] = useState<ElectionResult | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track container width so chart options update when the card resizes
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setIsMobile(entry.contentRect.width <= MOBILE_BREAKPOINT)
      }
    })
    observer.observe(containerRef.current)
    // Set initial value
    setIsMobile(containerRef.current.offsetWidth <= MOBILE_BREAKPOINT)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const getElectionResult = async (): Promise<ElectionResult | null> => {
      const searchQuery = qs.stringify(
        {
          depth: 2,
          limit: 1,
          where: {
            and: [{ election: { equals: election.id } }, { position: { equals: positionId } }],
          },
        },
        { encode: false },
      )

      try {
        const req = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/electionResults?${searchQuery}`,
          { credentials: 'include' },
        )
        const json = await req.json()
        const { docs } = json as { docs: ElectionResult[] }
        return docs.length > 0 ? docs[0] : null
      } catch (err) {
        console.warn(err) // eslint-disable-line no-console
      }
    }
    getElectionResult().then(setResult)
  }, [user, positionId, election.id])

  if (!result) {
    return null
  }

  const { id, electedNominee, rounds } = result
  const electedNomineeName = getName(electedNominee as Nomination | null)
  const chartOptions = buildOptions(isMobile)

  return (
    <div className={classes.resultsContainer} ref={containerRef}>
      <div className={classes.titleHolder}>
        <div className={classes.electedBadge}>
          <span className={classes.electedLabel}>Elected</span>
          <h4 className={classes.electedNominee}>{electedNomineeName}</h4>
        </div>
        <Button
          newTab={true}
          className={classes.downloadTranscript}
          href={`${process.env.NEXT_PUBLIC_SERVER_URL}/api/electionResults/${id}/transcript`}
          appearance="secondary"
          label="Download Transcript"
        />
      </div>
      <div className={classes.grid}>
        {rounds.map((round, index) => {
          const { votes, outcome, nomination } = round
          const nomineeName = getName(nomination as Nomination)
          // Number of candidates determines minimum chart height so all bars are visible
          const candidateCount = votes.length
          const sorted_votes = votes
            .map(v => ({ x: v.count, y: splitNames(v.nomination as Nomination) }))
            .sort((a, b) => b.x - a.x)

          return (
            <div key={index} className={classes.roundCard}>
              <div className={classes.roundHeader}>
                <span className={classes.roundNumber}>Round {index + 1}</span>
                <span className={`${classes.outcomeBadge} ${classes[outcome.toLowerCase()]}`}>
                  {nomineeName} was {outcome}ed
                </span>
              </div>
              <div
                className={classes.chartWrapper}
                style={{
                  // Ensure each candidate gets at least enough vertical space to render.
                  // 60px per candidate on desktop, 44px on mobile — whichever is larger
                  // than the CSS minimum set in the stylesheet.
                  minHeight: isMobile
                    ? `${Math.max(180, candidateCount * 44)}px`
                    : `${Math.max(220, candidateCount * 60)}px`,
                }}
              >
                <Bar
                  className={classes.chart}
                  data={{
                    labels: sorted_votes.map(v => v.y),
                    datasets: [
                      {
                        label: 'Votes',
                        data: sorted_votes.map(v => v.x),
                        backgroundColor: 'rgba(211, 0, 26, 0.6)',
                        borderColor: 'rgb(211, 0, 26)',
                        borderWidth: 1,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
