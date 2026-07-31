'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import moment from 'moment-timezone'

import type { Event } from '../../../../payload/payload-types'

import 'leaflet/dist/leaflet.css'

import classes from './index.module.scss'

type Props = {
  events: Event[]
}

const TIMEZONE = 'Europe/London'
const SOUTHAMPTON: L.LatLngTuple = [50.935, -1.396]

const CATEGORY_COLORS: Record<NonNullable<Event['jumpstartCategory']>, string> = {
  welcome: 'var(--jumpstart-cat-welcome)',
  academic: 'var(--jumpstart-cat-academic)',
  social: 'var(--jumpstart-cat-social)',
  competitive: 'var(--jumpstart-cat-competitive)',
}

const CATEGORY_LABELS: Record<NonNullable<Event['jumpstartCategory']>, string> = {
  welcome: 'Welcome / General',
  academic: 'Academic',
  social: 'Social',
  competitive: 'Competitive / Track',
}

const getDateKey = (dateStr: string): string => {
  return moment.utc(dateStr).tz(TIMEZONE).format('YYYY-MM-DD')
}

const formatDayPill = (dateKey: string): string => {
  return moment(dateKey, 'YYYY-MM-DD').format('ddd Do MMM')
}

const getCategory = (event: Event): NonNullable<Event['jumpstartCategory']> | null => {
  const category = event.jumpstartCategory
  return category && category in CATEGORY_COLORS ? category : null
}

const createIcon = (event: Event, sequence: number): L.DivIcon => {
  const category = getCategory(event)
  const markerColor = category ? CATEGORY_COLORS[category] : 'var(--jumpstart-neon-purple)'

  return L.divIcon({
    className: classes.marker,
    html: `<div class="${classes.markerInner}" style="--marker-color: ${markerColor}"><span class="${classes.markerNumber}">${sequence}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -16],
  })
}

const formatTime = (dateStr: string): string => {
  return moment.utc(dateStr).tz(TIMEZONE).format('HH:mm')
}

export const JumpstartMapView: React.FC<Props> = ({ events }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const eventsWithCoords = useMemo(
    () => events.filter(e => typeof e.latitude === 'number' && typeof e.longitude === 'number'),
    [events],
  )

  const dayKeys = useMemo(() => {
    const keys = new Set<string>()
    eventsWithCoords.forEach(e => keys.add(getDateKey(e.date)))
    return Array.from(keys).sort()
  }, [eventsWithCoords])

  const filteredEvents = useMemo(() => {
    if (!selectedDay) return eventsWithCoords
    return eventsWithCoords.filter(e => getDateKey(e.date) === selectedDay)
  }, [eventsWithCoords, selectedDay])

  const sortedEvents = useMemo(
    () =>
      [...filteredEvents].sort((a, b) => {
        const dayCompare = getDateKey(a.date).localeCompare(getDateKey(b.date))
        if (dayCompare !== 0) return dayCompare

        const orderCompare = (a.sortOrder || 0) - (b.sortOrder || 0)
        if (orderCompare !== 0) return orderCompare

        const timeCompare = a.date.localeCompare(b.date)
        if (timeCompare !== 0) return timeCompare

        return a.name.localeCompare(b.name)
      }),
    [filteredEvents],
  )

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: SOUTHAMPTON,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    if (sortedEvents.length === 0) return

    const bounds = L.latLngBounds([])

    sortedEvents.forEach((event, index) => {
      const lat = event.latitude as number
      const lng = event.longitude as number
      const latLng: L.LatLngTuple = [lat, lng]
      const sequence = index + 1
      const category = getCategory(event)
      const categoryLabel = category ? CATEGORY_LABELS[category] : 'Uncategorised'

      const startTime = formatTime(event.date)
      const endStr = event.endTime ? ` – ${formatTime(event.endTime)}` : ''
      const timeStr = `${startTime}${endStr}`

      const popupContent = `
        <div class="${classes.popup}">
          <span class="${classes.popupTime}">${sequence}. ${timeStr}</span>
          <strong class="${classes.popupTitle}">${event.name}</strong>
          <span class="${classes.popupCategory}">${categoryLabel}</span>
          ${event.location ? `<span class="${classes.popupLocation}">${event.location}</span>` : ''}
          ${
            event.mapsUrl
              ? `<a href="${event.mapsUrl}" target="_blank" rel="noopener noreferrer" class="${classes.popupLink}">Get me there →</a>`
              : ''
          }
        </div>
      `

      const marker = L.marker(latLng, {
        icon: createIcon(event, sequence),
        title: `${sequence}. ${event.name} — ${categoryLabel}`,
      })
        .addTo(map)
        .bindPopup(popupContent, { className: classes.popupContainer })

      bounds.extend(latLng)
    })

    if (sortedEvents.length === 1) {
      map.setView(bounds.getCenter(), 16)
    } else {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [sortedEvents])

  return (
    <div className={classes.container}>
      {eventsWithCoords.length === 0 ? (
        <div className={classes.empty}>No events with map coordinates yet.</div>
      ) : (
        <>
          <div className={classes.dayFilter}>
            <button
              className={[classes.dayPill, !selectedDay ? classes.dayPillActive : ''].join(' ')}
              onClick={() => setSelectedDay(null)}
            >
              All Days
            </button>
            {dayKeys.map(dateKey => (
              <button
                key={dateKey}
                className={[
                  classes.dayPill,
                  selectedDay === dateKey ? classes.dayPillActive : '',
                ].join(' ')}
                onClick={() => setSelectedDay(dateKey)}
              >
                {formatDayPill(dateKey)}
              </button>
            ))}
          </div>
          <div ref={mapContainerRef} className={classes.map} />
        </>
      )}
    </div>
  )
}
