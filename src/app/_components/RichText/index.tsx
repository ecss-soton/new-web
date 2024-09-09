import React from 'react'
import { Inter } from '@next/font/google'

import serialize from './serialize'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

const RichText: React.FC<{ className?: string; content: any }> = ({ className, content }) => {
  if (!content) {
    return null
  }

  return (
    <div className={[classes.richText, className, inter.className].filter(Boolean).join(' ')}>
      {serialize(content)}
    </div>
  )
}

export default RichText
