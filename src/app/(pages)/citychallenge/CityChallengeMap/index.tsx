'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'

import type { CityChallengeLocation } from '../../../../payload/payload-types'

import 'leaflet/dist/leaflet.css'

import classes from './index.module.scss'

const SOUTHAMPTON: L.LatLngTuple = [50.935, -1.396]
const STORAGE_KEY = 'citychallenge-discovered'

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function loadDiscoveredIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return new Set(parsed)
    }
  } catch {
    // corrupt localStorage — start fresh
  }
  return new Set()
}

function saveDiscoveredIds(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // quota exceeded or unavailable
  }
}

function createMarkerIcon(location: CityChallengeLocation, index: number): L.DivIcon {
  const n = index + 1
  return L.divIcon({
    className: classes.marker,
    html: `<div class="${classes.markerInner}"><span class="${classes.markerNumber}">${n}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -18],
  })
}

function createPopupContent(location: CityChallengeLocation): HTMLDivElement {
  const popup = document.createElement('div')
  popup.className = classes.popup

  const title = document.createElement('strong')
  title.className = classes.popupTitle
  title.textContent = location.name
  popup.append(title)

  if (location.description) {
    const desc = document.createElement('span')
    desc.className = classes.popupDesc
    desc.textContent = location.description
    popup.append(desc)
  }

  return popup
}

type Props = {
  locations: CityChallengeLocation[]
  isAdmin?: boolean
}

export const CityChallengeMap: React.FC<Props> = ({ locations, isAdmin }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())

  const [userPosition, setUserPosition] = useState<GeolocationPosition | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [discoveredIds, setDiscoveredIds] = useState<Set<string>>(() => loadDiscoveredIds())
  const [copied, setCopied] = useState(false)
  const [mockLat, setMockLat] = useState('50.935')
  const [mockLng, setMockLng] = useState('-1.396')
  const [mockEnabled, setMockEnabled] = useState(false)
  const [showMockPanel, setShowMockPanel] = useState(false)

  const discoveredSorted = useMemo(() => {
    return locations.filter(l => l.id && discoveredIds.has(l.id))
  }, [locations, discoveredIds])

  const discoveredSortedRef = useRef(discoveredSorted)
  discoveredSortedRef.current = discoveredSorted

  const drawCanvas = useCallback(() => {
    const map = mapRef.current
    const canvas = canvasRef.current
    if (!map || !canvas) return

    const container = map.getContainer()
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'rgba(18, 18, 20, 0.82)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    ctx.font = '14px monospace'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
    for (let x = 20; x < canvas.width; x += 80) {
      for (let y = 20; y < canvas.height; y += 80) {
        ctx.fillText('?', x, y)
      }
    }

    ctx.font = '13px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.textAlign = 'center'
    ctx.fillText('Move around to reveal hidden locations', canvas.width / 2, canvas.height - 24)

    const discovered = discoveredSortedRef.current
    discovered.forEach(location => {
      if (!location.latitude || !location.longitude) return
      const point = map.latLngToContainerPoint([location.latitude, location.longitude])
      const radius = 80
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = 'var(--jumpstart-neon-lime)'
      ctx.fill()
    })
  }, [])

  const drawCanvasRef = useRef(drawCanvas)
  drawCanvasRef.current = drawCanvas

  const discoverLocation = useCallback((locationId: string) => {
    setDiscoveredIds(prev => {
      if (prev.has(locationId)) return prev
      const next = new Set(prev)
      next.add(locationId)
      saveDiscoveredIds(next)
      return next
    })
  }, [])

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

    const mapContainer = map.getContainer()
    const canvas = document.createElement('canvas')
    canvas.className = classes.scratchcard
    canvas.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;z-index:450;pointer-events:none;'
    mapContainer.appendChild(canvas)
    canvasRef.current = canvas

    const handleMove = () => drawCanvasRef.current()
    map.on('moveend', handleMove)
    map.on('zoomend', handleMove)

    setTimeout(() => drawCanvasRef.current(), 300)

    return () => {
      map.remove()
      mapRef.current = null
      canvasRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(marker => map.removeLayer(marker))
    markersRef.current.clear()

    discoveredSorted.forEach((location, index) => {
      if (!location.id || !location.latitude || !location.longitude) return

      const latLng: L.LatLngTuple = [location.latitude, location.longitude]
      const marker = L.marker(latLng, {
        icon: createMarkerIcon(location, index),
        title: `${index + 1}. ${location.name}`,
      })
        .addTo(map)
        .bindPopup(createPopupContent(location), {
          className: classes.popupContainer,
        })

      markersRef.current.set(location.id, marker)
    })

    drawCanvasRef.current()
  }, [discoveredSorted])

  useEffect(() => {
    let watchId: number | null = null

    if (mockEnabled) return

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        position => {
          setUserPosition(position)
          setGeoError(null)
        },
        err => {
          setGeoError(err.message)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      )
    } else {
      setGeoError('Geolocation is not supported by your browser.')
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    }
  }, [mockEnabled])

  useEffect(() => {
    if (mockEnabled) {
      const parsedLat = parseFloat(mockLat)
      const parsedLng = parseFloat(mockLng)
      if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
        setUserPosition({
          coords: {
            latitude: parsedLat,
            longitude: parsedLng,
            accuracy: 1,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        })
        setGeoError(null)
      }
    }
  }, [mockEnabled, mockLat, mockLng])

  useEffect(() => {
    if (!userPosition) return

    const { latitude, longitude } = userPosition.coords

    locations.forEach(location => {
      if (!location.id || discoveredIds.has(location.id)) return
      if (!location.latitude || !location.longitude) return

      const distance = haversineDistance(latitude, longitude, location.latitude, location.longitude)
      const radius = location.discoveryRadius ?? 50

      if (distance <= radius) {
        discoverLocation(location.id)
      }
    })
  }, [userPosition, locations, discoveredIds, discoverLocation])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  const totalCount = locations.length

  return (
    <div className={classes.wrapper}>
      <header className={classes.header}>
        <h1 className={classes.title}>City Challenge</h1>
        <div className={classes.stats}>
          <span className={classes.stat}>
            Discovered: {discoveredIds.size} / {totalCount}
          </span>
        </div>
        <div className={classes.actions}>
          <button type="button" className={classes.shareButton} onClick={copyLink}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          {geoError && <span className={classes.geoError}>{geoError}</span>}
        </div>
      </header>
      <p className={classes.intro}>
        Explore Southampton to uncover hidden locations. Move around in the real world to reveal
        parts of the map.
      </p>
      <div className={classes.mapContainer}>
        {locations.length === 0 ? (
          <div className={classes.empty}>No locations available yet.</div>
        ) : (
          <div ref={mapContainerRef} className={classes.map} />
        )}
      </div>
      {isAdmin && (
        <div className={classes.mockPanel}>
          <button
            type="button"
            className={classes.mockToggle}
            onClick={() => setShowMockPanel(p => !p)}
          >
            {showMockPanel ? 'Hide' : 'Mock Location'}
          </button>
          {showMockPanel && (
            <div className={classes.mockControls}>
              <label className={classes.mockLabel}>
                Lat
                <input
                  className={classes.mockInput}
                  type="text"
                  value={mockLat}
                  onChange={e => setMockLat(e.target.value)}
                />
              </label>
              <label className={classes.mockLabel}>
                Lng
                <input
                  className={classes.mockInput}
                  type="text"
                  value={mockLng}
                  onChange={e => setMockLng(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={classes.mockButton}
                onClick={() => setMockEnabled(e => !e)}
              >
                {mockEnabled ? 'Stop Mock' : 'Start Mock'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
