'use client'

import React, { useEffect, useState } from 'react'

import { useAuth } from '../../_providers/Auth'

import classes from './InterestedButton.module.scss'

export const InterestedButton: React.FC<{
  eventId: string
  initialInterestedCount: number
}> = ({ eventId, initialInterestedCount }) => {
  const { user, status } = useAuth()
  const [count, setCount] = useState(initialInterestedCount)
  const [isInterested, setIsInterested] = useState(false)
  const [localInit, setLocalInit] = useState(false)
  const [loading, setLoading] = useState(false)

  // Initialize from user object
  useEffect(() => {
    if (user && !localInit) {
      const userInterested = (user as any).interestedEvents?.some((e: any) => 
          typeof e === 'string' ? e === eventId : e?.id === eventId
      )
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
    
    // Check state before applying to know bounds
    const willBeInterested = !isInterested;

    setIsInterested(willBeInterested)
    setCount(prev => willBeInterested ? prev + 1 : Math.max(0, prev - 1))

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/events/${eventId}/interested`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!res.ok) {
        if (res.status === 401) {
            setIsInterested(isInterested);
            setCount(prev => willBeInterested ? Math.max(0, prev - 1) : prev + 1);
            window.location.href = `/login?error=${encodeURIComponent('You must be logged in to mark events as interested.')}&redirect=${encodeURIComponent('/events')}`
        } else {
             throw new Error('Failed to toggle interest')
        }
      } else {
         const data = await res.json()
         setCount(data.interestedCount)
         setIsInterested(data.isInterested)
      }
    } catch (err) {
      console.error(err)
      setIsInterested(isInterested)
      setCount(prev => willBeInterested ? Math.max(0, prev - 1) : prev + 1);
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
