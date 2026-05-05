import React from 'react'

import { Page } from '../../../payload/payload-types'
import { Button } from '../../_components/Button'
import { Media } from '../../_components/Media'
import RichText from '../../_components/RichText'
import MerchGridBlockItem from './MerchGridBlockItem'

import classes from './index.module.scss'

type Props = Extract<Page['layout'][0], { blockType: 'merchBlock' }>

export const MerchBlock: React.FC<Props> = props => {
  const { heroTitle, heroContent, merchItems, notices } = props

  const hasMerch = merchItems && merchItems.length > 0

  return (
    <div className={classes.pageContainer}>
      <h1 className={classes.heroTitle}>{heroTitle}</h1>

      <div className={classes.heroContent}>
        <RichText content={heroContent} />
      </div>

      {hasMerch ? (
        <MerchGridBlockItem items={merchItems} />
      ) : (
        <div className={classes.emptyState}>
          
        </div>
      )}

      {notices && (
        <div className={classes.alertBox}>
          <RichText content={notices} />
        </div>
      )}
    </div>
  )
}
