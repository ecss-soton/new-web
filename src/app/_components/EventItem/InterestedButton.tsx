'use client'

import React, { useEffect, useState } from 'react'

import { useAuth } from '../../_providers/Auth'

import classes from './InterestedButton.module.scss'

export const InterestedButton: React.FC<{
  eventId: string
  initialInterestedCount: number
}> = ({ eventId, initialInterestedCount }) => {
  // IMPORTANT: Pull in setUser (or whatever your update function is called in your Auth context)
  const { user, status, setUser } = useAuth() 
  const [count, setCount] = useState(initialInterestedCount)
  const [isInterested, setIsInterested] = useState(false)
  const [localInit, setLocalInit] = useState(false)
  const [loading, setLoading] = useState(false)

  // Initialize from user object
  useEffect(() => {
    if (user && !localInit) {
      const checkEventId = (e: any) => (typeof e === 'string' ? e === eventId : e?.id === eventId)
      const userInterested = (user as any).interestedEvents?.some(checkEventId)
      setIsInterested(!!userInterested)
      setLocalInit(true)
    }
  }, [user, eventId, localInit])

  const toggleInterest = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (loading) return

    if (status !== 'loggedIn') {
      window.location.href = `/login?error=${encodeURIComponent(
        'You must be logged in to mark events as interested.',
      )}&redirect=${encodeURIComponent('/events')}`
      return
    }

    setLoading(true)

    // Optimistic UI update
    const willBeInterested = !isInterested
    setIsInterested(willBeInterested)
    setCount(prev => (willBeInterested ? prev + 1 : Math.max(0, prev - 1)))

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/events/${eventId}/interested`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      if (!res.ok) {
        if (res.status === 401) {
          // Revert optimistic update
          setIsInterested(!willBeInterested)
          setCount(prev => (willBeInterested ? Math.max(0, prev - 1) : prev + 1))
          window.location.href = `/login?error=${encodeURIComponent(
            'You must be logged in to mark events as interested.',
          )}&redirect=${encodeURIComponent('/events')}`
        } else {
          throw new Error('Failed to toggle interest')
        }
      } else {
        const data = await res.json()
        setCount(data.interestedCount)
        setIsInterested(data.isInterested)

        // ---> THE FIX: Update the global Auth context <---
        // This tells the calendar (and any other component) that the user's data changed
        if (setUser && user) {
          const currentEvents = (user as any).interestedEvents || []
          const checkEventId = (ev: any) => (typeof ev === 'string' ? ev === eventId : ev?.id === eventId)
          
          let updatedEvents;
          
          if (data.isInterested) {
            // Add the event if they are now interested
            if (!currentEvents.some(checkEventId)) {
              updatedEvents = [...currentEvents, eventId]
            } else {
              updatedEvents = currentEvents
            }
          } else {
            // Remove the event if they are no longer interested
            updatedEvents = currentEvents.filter((ev: any) => !checkEventId(ev))
          }

          // Push the new user object into the global state
          setUser({
            ...user,
            interestedEvents: updatedEvents
          })
        }
      }
    } catch (err) {
      // Revert optimistic update on error
      setIsInterested(!willBeInterested)
      setCount(prev => (willBeInterested ? Math.max(0, prev - 1) : prev + 1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleInterest}
      className={`${classes.interestedBtn} ${isInterested ? classes.active : ''}`}
      disabled={loading}
    >
      <span className={classes.icon}>{isInterested ? '★' : '☆'}</span>
      <span className={classes.text}>{isInterested ? 'Interested' : 'Interested?'}</span>
      <span className={classes.count}>({count})</span>
    </button>
  )
}