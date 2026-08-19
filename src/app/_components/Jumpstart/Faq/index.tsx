import React from 'react'

import { bungee, inter } from '../../../_utilities/font'

import classes from './index.module.scss'

export type JumpstartFaqItem = {
  question: string
  answer: string
}

type Props = {
  title?: string | null
  faqs?: JumpstartFaqItem[] | null
}

export const JumpstartFaq: React.FC<Props> = ({ title, faqs }) => {
  if (!faqs || faqs.length === 0) return null

  return (
    <section className={classes.section} id="faqs">
      <h2 className={[classes.title, bungee.className].join(' ')}>{title || 'FAQS'}</h2>
      <div className={[classes.list, inter.className].join(' ')}>
        {faqs.map((faq, i) => (
          <details key={i} className={classes.item}>
            <summary className={classes.question}>{faq.question}</summary>
            <p className={classes.answer}>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
