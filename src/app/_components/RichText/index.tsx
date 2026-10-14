import React from 'react'

import { inter } from '../../_utilities/font'
import serialize from './serialize'

import classes from './index.module.scss'

const RichText: React.FC<{
  className?: string
  content: any
  fontClassName?: string
}> = ({ className, content, fontClassName = inter.className }) => {
  if (!content) {
    return null
  }

  return (
    <div className={[classes.richText, className, fontClassName].filter(Boolean).join(' ')}>
      {serialize(content)}
    </div>
  )
}

export default RichText
