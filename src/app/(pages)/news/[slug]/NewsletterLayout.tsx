import React from 'react'

import { Newsletter } from '../../../../payload/payload-types'
import { Article } from '../../../_blocks/Article'
import { Briefs } from '../../../_blocks/Briefs'
import { Figure } from '../../../_blocks/Figure'
import { SectionRule } from '../../../_blocks/SectionRule'

import classes from './NewsletterLayout.module.scss'

export const NewsletterLayout: React.FC<{ blocks: Newsletter['layout'] }> = ({ blocks }) => {
  if (!blocks?.length) return null

  return (
    <div className={classes.layout}>
      {blocks.map((block, index) => {
        const key = block.id || index

        switch (block.blockType) {
          case 'article':
            return <Article key={key} {...block} />
          case 'figure':
            return <Figure key={key} {...block} />
          case 'briefs':
            return <Briefs key={key} {...block} />
          case 'sectionRule':
            return <SectionRule key={key} {...block} />
          default:
            return null
        }
      })}
    </div>
  )
}
