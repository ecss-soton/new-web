import React from 'react'
import { Inter } from '@next/font/google'

import { Event } from '../../../payload/payload-types'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const EventItem: React.FC<{
  event?: Event
  onEventClick: (event: Event | null) => void
}> = ({ event, onEventClick }) => {
  const { name, date, description } = event || {}

  const handleClick = () => {
    onEventClick(event)
  }

  const handleClose = () => {
    onEventClick(null)
  }

  const getMonthName = (monthNumber: number): string => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return monthNames[monthNumber - 1]
  }

  const truncateDescription = (description: string, maxLength: number) => {
    if (description.length > maxLength) {
      return description.substring(0, maxLength) + '...'
    }
    return description
  }

  const dateParts = date.split('-')
  const year = dateParts[0]
  const month = parseInt(dateParts[1], 10)
  const day = dateParts[2].split('T')[0]
  const monthName = getMonthName(month)

  const truncatedDesc = truncateDescription(description, 150)

  // const { slug, title, categories, meta } = doc || {}
  // const { description, image: metaImage } = meta || {}

  // const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  // const titleToUse = titleFromProps || title
  // const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  // const href = `/${relationTo}/${slug}`

  return (
    <div className={[classes.rectangle, inter.className].join(' ')} onClick={handleClick}>
      <div className={classes.when}>
        <div className={classes.date}>{day}</div>
        <div className={classes.month}>{monthName}</div>
      </div>
      <div className={classes.what}>
        <div className={classes.name}>{name}</div>
        <p className={classes.desc}>{truncatedDesc}</p>
      </div>
    </div>
  )
}
