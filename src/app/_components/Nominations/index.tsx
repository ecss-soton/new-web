import React, { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import qs from 'qs'

import {
  Election,
  Media,
  Nomination,
  Position,
  Sponsor,
  User,
} from '../../../payload/payload-types'
import { Button } from '../Button'
import { Chevron } from '../Chevron'
import { Gutter } from '../Gutter'
import { CMSLinkType } from '../Link'
import { LinkList } from '../LinkList'
import { Media as MediaComp } from '../Media'
import RichText from '../RichText'
import { SupportNomination } from '../SupportNomination'

import classes from './index.module.scss'

export const Nominations: React.FC<{
  positionId?: string
  election?: Election
  user?: User
  showSupport?: boolean
}> = props => {
  const { showSupport, positionId, election, user } = props

  let [nominations, setNominations] = useState<Nomination[] | null>(null)

  useEffect(() => {
    const getPositions = async (): Promise<Nomination[]> => {
      const searchQuery = qs.stringify(
        {
          depth: 1,
          where: {
            and: [
              {
                or: [
                  {
                    droppedOut: { equals: false },
                  },
                  {
                    nominees: { contains: user.id },
                  },
                ],
              },
              { election: { equals: election.id } },
              { position: { equals: positionId } },
            ],
          },
        },
        { encode: false },
      )

      try {
        const req = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations?${searchQuery}`,
        )

        const json = await req.json()

        const { docs } = json as { docs: Nomination[] }
        return docs
      } catch (err) {
        console.warn(err) // eslint-disable-line no-console
      }
    }
    getPositions().then(setNominations)
  }, [user, positionId, election.id])

  const isBeingVoted =
    new Date().getTime() >= Date.parse(election.votingStart) &&
    new Date().getTime() <= Date.parse(election.votingEnd)

  return (
    <div>
      {nominations?.map((nomination, index) => {
        const { id, supporters, populatedNominees, nickname } = nomination
        const nomineeNames = populatedNominees.map(n => n.name).join(' & ')
        const droppedOut = nomination.droppedOut
        return (
          <Fragment key={id}>
            <h5>
              {droppedOut && (
                <s>
                  {nickname ? `${nickname} -` : ''} {nomineeNames}
                </s>
              )}
              {!droppedOut && (
                <span>
                  {nickname ? `${nickname} -` : ''} {nomineeNames}
                </span>
              )}
              {(isBeingVoted || populatedNominees.map(n => n.id).includes(user.id)) && (
                <Button
                  appearance={'primary'}
                  label={'View'}
                  href={`/nominations/${nomination.id}`}
                />
              )}
              {showSupport && (
                <SupportNomination nominationId={id} supporters={supporters} user={user} />
              )}
            </h5>
          </Fragment>
        )
      })}
    </div>
  )
}
