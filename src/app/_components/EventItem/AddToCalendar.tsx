'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'

import type { Event } from '../../../payload/payload-types'
import { getEventCalendarLinks } from '../../../utilities/eventCalendar'

import classes from './AddToCalendar.module.scss'

export const AddToCalendar: React.FC<{ event: Event }> = ({ event }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const links = getEventCalendarLinks(event, process.env.NEXT_PUBLIC_SERVER_URL || '')

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (pointerEvent: PointerEvent) => {
      if (!wrapperRef.current?.contains(pointerEvent.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!links) return null

  return (
    <div className={classes.wrapper} ref={wrapperRef}>
      <button
        type="button"
        ref={triggerRef}
        className={classes.trigger}
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen(open => !open)}
      >
        <Image
          src="/calendar-svgrepo-com.svg"
          alt=""
          width={14}
          height={14}
          className={classes.icon}
        />
        <span>Add to calendar</span>
      </button>

      {isOpen && (
        <div id={menuId} className={classes.menu}>
          <span className={classes.menuLabel}>Open in</span>
          <a
            href={links.google}
            target="_blank"
            rel="noopener noreferrer"
            className={classes.menuItem}
            onClick={() => setIsOpen(false)}
          >
            Google Calendar
          </a>
          <a
            href={links.outlook}
            target="_blank"
            rel="noopener noreferrer"
            className={classes.menuItem}
            onClick={() => setIsOpen(false)}
          >
            Outlook
          </a>
          <a href={links.ics} className={classes.menuItem} onClick={() => setIsOpen(false)}>
            Apple Calendar (.ics)
          </a>
        </div>
      )}
    </div>
  )
}
