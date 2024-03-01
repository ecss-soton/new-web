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
import { getArrayID } from '../../../payload/utilities/getID'
import { Button } from '../Button'
import { Chevron } from '../Chevron'
import { Gutter } from '../Gutter'
import { CMSLinkType } from '../Link'
import { LinkList } from '../LinkList'
import { Media as MediaComp } from '../Media'
import RichText from '../RichText'

import classes from './index.module.scss'

async function toggleSupport(
  nominationId: string,
  supporters: string[],
  setSupporters,
): Promise<boolean> {
  let userID: null | string = null

  try {
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const data = await req.json()
    userID = data?.user?.id
  } catch (err) {
    console.log(err)
  }

  const searchQuery = qs.stringify(
    {
      where: {
        id: {
          equals: nominationId,
        },
      },
    },
    { encode: false },
  )
  let supporterIds = [...supporters]
  let isSupporting = false
  if (supporterIds.includes(userID)) {
    supporterIds = supporterIds.filter(id => id !== userID)
  } else {
    supporterIds.push(userID)
    isSupporting = true
  }

  try {
    const req = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations/${nominationId}?${searchQuery}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supporters: supporterIds,
        }),
      },
    )

    const { doc } = (await req.json()) as { doc: Nomination }
    isSupporting = getArrayID(doc.supporters).includes(userID)
    setSupporters(getArrayID(doc.supporters))
  } catch (err) {
    console.warn(err) // eslint-disable-line no-console
  }

  return isSupporting
}

export const SupportNomination: React.FC<{
  nominationId?: string
  supporters?: (string | User)[]
}> = props => {
  const { nominationId, supporters } = props

  let [supporterIds, setSupporterIds] = useState<string[]>(getArrayID(supporters))
  let [isSupporting, setIsSupporting] = useState<boolean>(
    supporters.some(s => typeof s != 'string'),
  )

  return (
    <button
      type="button"
      className={classes.button}
      onClick={async () => {
        let su = await toggleSupport(nominationId, supporterIds, setSupporterIds)
        console.log(su)
        setIsSupporting(su)
      }}
    >
      {isSupporting ? <p>UnSupport</p> : <p>Support</p>}
      <span>({supporterIds.length})</span>
    </button>
  )
}
