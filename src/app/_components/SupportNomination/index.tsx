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

async function toggleSupport(nominationId: string, setSupporters): Promise<boolean> {
  try {
    const req = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations/${nominationId}/toggleSupport`,
      {
        method: 'POST',
        credentials: 'include',
      },
    )

    const result = (await req.json()) as {
      success: boolean
      supporting: boolean
      supporters: string[]
    }
    setSupporters(result.supporters)
    return result.supporting
  } catch (err) {
    console.warn(err) // eslint-disable-line no-console
  }

  return false
}

export const SupportNomination: React.FC<{
  nominationId?: string
  supporters?: (string | User)[]
  user?: User
}> = props => {
  const { nominationId, supporters, user } = props

  let [supporterIds, setSupporterIds] = useState<string[]>(getArrayID(supporters))
  let [isSupporting, setIsSupporting] = useState<boolean>(
    getArrayID(supporters).some(id => id === user.id),
  )

  return (
    <button
      type="button"
      className={classes.button}
      onClick={async () => {
        let su = await toggleSupport(nominationId, setSupporterIds)
        setIsSupporting(su)
      }}
    >
      {isSupporting ? <span>UnSupport</span> : <span>Support</span>}
      <span> ({supporterIds.length})</span>
    </button>
  )
}
