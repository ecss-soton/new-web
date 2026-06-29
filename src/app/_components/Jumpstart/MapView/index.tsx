'use client'

import React, { useEffect, useRef } from 'react'
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

const createIcon = (): L.DivIcon => {
  return L.divIcon({
    className: classes.marker,
    html: `<div class="${classes.markerInner}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -16],
  })
}

const formatTime = (dateStr: string): string => {
  return moment.utc(dateStr).tz(TIMEZONE).format('HH:mm')
}

export const JumpstartMapView: React.FC<Props> = ({ events }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  const eventsWithCoords = events.filter(
    e => typeof e.latitude === 'number' && typeof e.longitude === 'number',
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

    if (eventsWithCoords.length === 0) return

    const bounds = L.latLngBounds([])
    const icon = createIcon()

    eventsWithCoords.forEach(event => {
      const lat = event.latitude as number
      const lng = event.longitude as number
      const latLng: L.LatLngTuple = [lat, lng]

      const startTime = formatTime(event.date)
      const endStr = event.endTime ? ` – ${formatTime(event.endTime)}` : ''
      const timeStr = `${startTime}${endStr}`

      const popupContent = `
        <div class="${classes.popup}">
          <span class="${classes.popupTime}">${timeStr}</span>
          <strong class="${classes.popupTitle}">${event.name}</strong>
          ${event.location ? `<span class="${classes.popupLocation}">${event.location}</span>` : ''}
          ${
            event.mapsUrl
              ? `<a href="${event.mapsUrl}" target="_blank" rel="noopener noreferrer" class="${classes.popupLink}">Get me there →</a>`
              : ''
          }
        </div>
      `

      const marker = L.marker(latLng, { icon })
        .addTo(map)
        .bindPopup(popupContent, { className: classes.popupContainer })

      bounds.extend(latLng)
    })

    if (eventsWithCoords.length === 1) {
      map.setView(bounds.getCenter(), 16)
    } else {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [eventsWithCoords])

  return (
    <div className={classes.container}>
      {eventsWithCoords.length === 0 && (
        <div className={classes.empty}>No events with map coordinates yet.</div>
      )}
      <div ref={mapContainerRef} className={classes.map} />
    </div>
  )
}
