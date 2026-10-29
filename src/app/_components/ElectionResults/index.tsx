'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, Tooltip, BarElement)

import { ElectionResult, Nomination } from '../../../payload/payload-types'
import { nominationDisplayName } from '../../../utilities/nominationLabel'
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

function splitNames(nomination: Nomination | string | null): string[] {
  if (!nomination) {
    return lineSplitter('Re-Open Nominations', 15)
  }

  if (typeof nomination === 'string') {
    return lineSplitter('Unknown', 15)
  }

  const names = (nomination.populatedNominees ?? [])
    .map(nominee => nominee.name)
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)

  if (names.length === 0) {
    return lineSplitter('Unknown', 15)
  }

  return names.reduce<string[]>((lines, name) => {
    lines.push(...lineSplitter(name, 14))
    return lines
  }, [])
}

/**
 * Round-by-round chart for one published result. Rendered only when the admin
 * has enabled detailed results and the user expands the summary.
 */
export const ElectionResults: React.FC<{ result: ElectionResult }> = ({ result }) => {
  const { id, rounds } = result
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track container width so chart options update when the card resizes.
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setIsMobile(entry.contentRect.width <= MOBILE_BREAKPOINT)
      }
    })

    observer.observe(containerRef.current)
    setIsMobile(containerRef.current.offsetWidth <= MOBILE_BREAKPOINT)

    return () => observer.disconnect()
  }, [])

  const chartOptions = buildOptions(isMobile)

  return (
    <div className={classes.resultsContainer} ref={containerRef}>
      <div className={classes.titleHolder}>
        <h4 className={classes.roundsHeading}>Voting rounds</h4>
        <Button
          newTab={true}
          className={classes.downloadTranscript}
          href={`${process.env.NEXT_PUBLIC_SERVER_URL}/api/electionResults/${id}/transcript`}
          appearance="secondary"
          label="Download Transcript"
        />
      </div>
      <div className={classes.grid}>
        {(rounds ?? []).map((round, index) => {
          const { votes, outcome, nomination } = round
          const nomineeName = nominationDisplayName(nomination ?? null)
          const candidateCount = votes.length
          const sortedVotes = votes
            .map(vote => ({ x: vote.count, y: splitNames(vote.nomination ?? null) }))
            .sort((a, b) => b.x - a.x)

          // Keep every candidate bar visible and give long names room to wrap.
          const chartHeight = Math.max(isMobile ? 200 : 240, candidateCount * (isMobile ? 48 : 64))

          return (
            <div key={index} className={classes.roundCard}>
              <div className={classes.roundHeader}>
                <span className={classes.roundNumber}>Round {index + 1}</span>
                <span className={`${classes.outcomeBadge} ${classes[outcome.toLowerCase()]}`}>
                  {nomineeName} was {outcome}ed
                </span>
              </div>
              <div className={classes.chartWrapper} style={{ height: `${chartHeight}px` }}>
                <Bar
                  className={classes.chart}
                  data={{
                    labels: sortedVotes.map(vote => vote.y),
                    datasets: [
                      {
                        label: 'Votes',
                        data: sortedVotes.map(vote => vote.x),
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
