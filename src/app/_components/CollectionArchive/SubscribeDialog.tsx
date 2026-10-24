'use client'

import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { type FeedType, getFeedUrls } from '../../../utilities/eventCalendar'
import { EVENT_CATEGORIES, type EventCategory } from '../../../utilities/eventCategories'
import { useAuth } from '../../_providers/Auth'

import classes from './SubscribeDialog.module.scss'

type CopyStatus = 'idle' | 'copied' | 'error'

const GOOGLE_ADD_BY_URL = 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl'
const OUTLOOK_CALENDAR = 'https://outlook.live.com/calendar/'

export const SubscribeDialog: React.FC = () => {
  const { user } = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const copiedTimer = useRef<NodeJS.Timeout | null>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [feedType, setFeedType] = useState<FeedType>('all')
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([])
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  const titleId = useId()
  const descriptionId = useId()
  const urlInputId = useId()

  const effectiveFeedType: FeedType = user ? feedType : 'all'

  const { icalUrl, webcalUrl } = getFeedUrls({
    baseUrl: process.env.NEXT_PUBLIC_SERVER_URL || '',
    feedType: effectiveFeedType,
    categories: selectedCategories,
    userId: user?.id,
  })

  const selectedLabels = EVENT_CATEGORIES.filter(category => {
    return selectedCategories.includes(category.value)
  }).map(category => category.label)

  const feedSummary = [
    effectiveFeedType === 'interested' ? 'your interested events' : 'all events',
    selectedLabels.length > 0 ? `in ${selectedLabels.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  const handleDialogClosed = useCallback(() => {
    setIsOpen(false)
    setCopyStatus('idle')
    triggerRef.current?.focus()
  }, [])

  const openDialog = useCallback(() => {
    setFeedType('all')
    setSelectedCategories([])
    setCopyStatus('idle')
    setIsOpen(true)

    const dialog = dialogRef.current
    if (!dialog) return

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }

    window.setTimeout(() => {
      dialog.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus()
    }, 0)
  }, [])

  const closeDialog = useCallback(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      setIsOpen(false)
      return
    }

    if (typeof dialog.close === 'function') {
      dialog.close()
    } else {
      dialog.removeAttribute('open')
      setIsOpen(false)
    }
  }, [])

  const handleBackdropClick = (clickEvent: React.MouseEvent<HTMLDialogElement>) => {
    if (clickEvent.target === dialogRef.current) closeDialog()
  }

  const copyFeedLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(icalUrl)
      setCopyStatus('copied')

      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopyStatus('idle'), 2500)
    } catch {
      setCopyStatus('error')
      urlInputRef.current?.focus()
      urlInputRef.current?.select()
    }
  }, [icalUrl])

  const toggleCategory = (category: EventCategory) => {
    setSelectedCategories(previous => {
      if (previous.includes(category)) return previous.filter(value => value !== category)
      return [...previous, category]
    })
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={classes.trigger}
        onClick={openDialog}
        aria-label="Subscribe to the ECSS events calendar"
      >
        <Image
          src="/calendar-svgrepo-com.svg"
          alt=""
          width={16}
          height={16}
          className={classes.triggerIcon}
        />
        <span>Subscribe</span>
      </button>

      <dialog
        ref={dialogRef}
        className={classes.dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={handleDialogClosed}
        onClick={handleBackdropClick}
      >
        <div className={classes.content}>
          <header className={classes.header}>
            <div>
              <h2 id={titleId} className={classes.title}>
                Subscribe to the ECSS calendar
              </h2>
              <p id={descriptionId} className={classes.description}>
                Add the feed once and every new ECSS event appears in your calendar automatically.
              </p>
            </div>
            <button
              type="button"
              className={classes.closeButton}
              onClick={closeDialog}
              aria-label="Close"
              data-dialog-autofocus
            >
              &times;
            </button>
          </header>

          <section className={classes.section}>
            <h3 className={classes.sectionTitle}>Which events?</h3>
            <div className={classes.segmented} role="group" aria-label="Events to include">
              <button
                type="button"
                aria-pressed={effectiveFeedType === 'all'}
                onClick={() => setFeedType('all')}
              >
                All events
              </button>
              {user && (
                <button
                  type="button"
                  aria-pressed={feedType === 'interested'}
                  onClick={() => setFeedType('interested')}
                >
                  My interested events
                </button>
              )}
            </div>
            {!user && (
              <p className={classes.hint}>
                <Link href="/login?redirect=/events">Log in</Link> to follow just the events
                you&apos;ve starred.
              </p>
            )}
          </section>

          <fieldset className={classes.section}>
            <legend className={classes.sectionTitle}>Categories (optional)</legend>
            <p className={classes.hint}>
              Leave all unselected to include every event, or pick only the categories you care
              about.
            </p>
            <div className={classes.chips}>
              {EVENT_CATEGORIES.map(category => {
                const isSelected = selectedCategories.includes(category.value)

                return (
                  <label
                    key={category.value}
                    className={[classes.chip, isSelected ? classes.chipActive : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(category.value)}
                    />
                    <span>{category.label}</span>
                  </label>
                )
              })}
            </div>
            {selectedCategories.length > 0 && (
              <button
                type="button"
                className={classes.clearButton}
                onClick={() => setSelectedCategories([])}
              >
                Clear categories
              </button>
            )}
            <p className={classes.summary}>Following {feedSummary}.</p>
          </fieldset>

          <section className={classes.section}>
            <h3 className={classes.sectionTitle}>Add it to your calendar</h3>
            <div className={classes.appGrid}>
              <a
                className={classes.app}
                href={GOOGLE_ADD_BY_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void copyFeedLink()}
              >
                <span className={classes.appName}>Google Calendar</span>
                <span className={classes.appHint}>
                  Copies the link and opens Settings &rarr; Add calendar &rarr; From URL
                </span>
              </a>
              <a className={classes.app} href={webcalUrl}>
                <span className={classes.appName}>Apple Calendar</span>
                <span className={classes.appHint}>
                  iPhone, iPad and Mac: opens the Calendar app and subscribes
                </span>
              </a>
              <a
                className={classes.app}
                href={OUTLOOK_CALENDAR}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void copyFeedLink()}
              >
                <span className={classes.appName}>Outlook</span>
                <span className={classes.appHint}>
                  Copies the link and opens Outlook (Add calendar &rarr; Subscribe from web)
                </span>
              </a>
            </div>
            <p className={classes.hint}>
              Google and Outlook need the link pasted into their “add from URL” box. It is copied
              for you when you click them.
            </p>
          </section>

          <section className={classes.section}>
            <label className={classes.inputLabel} htmlFor={urlInputId}>
              Subscription link
            </label>
            <div className={classes.copyRow}>
              <input
                ref={urlInputRef}
                id={urlInputId}
                className={classes.urlInput}
                readOnly
                value={icalUrl}
                onFocus={focusEvent => focusEvent.currentTarget.select()}
              />
              <button
                type="button"
                className={classes.copyButton}
                onClick={() => void copyFeedLink()}
              >
                {copyStatus === 'copied' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className={classes.copyStatus} role="status" aria-live="polite">
              {copyStatus === 'copied' && 'Link copied. Paste it into your calendar app.'}
              {copyStatus === 'error' &&
                'Could not copy automatically. Select the link and press Ctrl/Cmd+C.'}
            </p>
          </section>

          <footer className={classes.footer}>
            <p>
              Just want a single event? Use <strong>Add to calendar</strong> on that event card.
            </p>
            <p>You can unsubscribe at any time from your calendar app.</p>
          </footer>
        </div>
      </dialog>
    </>
  )
}
