'use client'

import React from 'react'
import { Inter } from '@next/font/google'
import Link from 'next/link'

import { Committee, Media } from '../../../payload/payload-types'
import { Image } from '../../_components/Media/Image'
import RichText from '../RichText'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

interface PopUpProps {
  name: string
  role: string
  bio:
    | {
        [k: string]: unknown
      }[]
    | null
  logo?: string | Media | null
  onCommitteeClick: (committee: Committee | null) => void
}

export const CommitteePopUp: React.FC<PopUpProps> = ({
  name,
  role,
  bio,
  logo,
  onCommitteeClick,
}) => {
  const closeClick = () => {
    onCommitteeClick(null)
  }

  return (
    <>
      <div className={[classes.background, inter.className].join(' ')} onClick={closeClick} />
      <div className={classes.rectangle}>
        <Link onClick={closeClick} className={classes.close} href={''}></Link>
        <div className={classes.info}>
          <Image resource={logo} alt={'committee'} imgClassName={classes.profile} />
          <div className={classes.bits}>
            <span className={classes.name}>{name}</span>
            <span className={classes.role}>{role}</span>
          </div>
        </div>
        {bio && <RichText className={classes.bio} content={bio} />}
      </div>
    </>
  )
}
