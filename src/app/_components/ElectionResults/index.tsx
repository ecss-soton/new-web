'use client'

import React, { Fragment, useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import qs from 'qs'
ChartJS.register(CategoryScale, LinearScale, Tooltip, BarElement)
// ChartJS.defaults.color = 'rgb(235, 235, 235)'
ChartJS.defaults.font.size = 14

import { Election, ElectionResult, Nomination, User } from '../../../payload/payload-types'
import { Button } from '../Button'
import { options } from './options'

import classes from './index.module.scss'

function lineSplitter(input: string, maxLength: number): string[] {
  let words = input.split(' ')
  let lines: string[] = []
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

  let [result, setResult] = useState<ElectionResult | null>(null)

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
          {
            credentials: 'include',
          },
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

  return (
    <div className={classes.resultsContainer}>
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
              <div className={classes.chartWrapper}>
                <Bar
                  width={500}
                  height={300}
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
                  options={options}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
