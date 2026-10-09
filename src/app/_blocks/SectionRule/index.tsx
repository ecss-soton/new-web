import React from 'react'

import { Newsletter } from '../../../payload/payload-types'
import { playfair, sourceSerif } from '../../_utilities/font'

import classes from './index.module.scss'

type Props = Extract<Newsletter['layout'][0], { blockType: 'sectionRule' }>

export const SectionRule: React.FC<Props> = ({ heading, subheading, sectionRuleSpan = 'full' }) => {
  return (
    <section className={classes.sectionRule} data-span={sectionRuleSpan}>
      <h2 className={[classes.heading, playfair.className].join(' ')}>{heading}</h2>
      {subheading && (
        <p className={[classes.subheading, sourceSerif.className].join(' ')}>{subheading}</p>
      )}
    </section>
  )
}
