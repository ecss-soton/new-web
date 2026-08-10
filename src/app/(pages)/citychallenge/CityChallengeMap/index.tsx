'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'

import type { CityChallengeLocation } from '../../../../payload/payload-types'

import 'leaflet/dist/leaflet.css'

import classes from './index.module.scss'

const SOUTHAMPTON: L.LatLngTuple = [50.935, -1.396]
const DISCOVERY_RADIUS = 50
const THROTTLE_MS = 10000

interface DiscoveredPoint {
  lat: number
  lng: number
}

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

function isNovelPoint(point: DiscoveredPoint, existing: DiscoveredPoint[]): boolean {
  return !existing.some(
    p => haversineDistance(point.lat, point.lng, p.lat, p.lng) < DISCOVERY_RADIUS,
  )
}

function createMarkerIcon(
  location: CityChallengeLocation,
  index: number,
  isCompleted: boolean,
): L.DivIcon {
  const n = index + 1
  const completedClass = isCompleted ? classes.markerCompleted : ''
  return L.divIcon({
    className: classes.marker,
    html: `<div class="${classes.markerInner} ${completedClass}"><span class="${classes.markerNumber}">${n}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -18],
  })
}

function createPopupContent(location: CityChallengeLocation, isCompleted: boolean): HTMLDivElement {
  const popup = document.createElement('div')
  popup.className = classes.popup

  const title = document.createElement('strong')
  title.className = classes.popupTitle
  title.textContent = location.name
  popup.append(title)

  if (isCompleted) {
    const badge = document.createElement('span')
    badge.className = classes.popupBadge
    badge.textContent = 'Completed'
    popup.append(badge)
  }

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
  teamId: string
  token: string
  discoveredAreas: DiscoveredPoint[]
  completedChallenges: string[]
}

export const CityChallengeMap: React.FC<Props> = ({
  locations,
  isAdmin,
  teamId,
  token,
  discoveredAreas: initialDiscovered,
  completedChallenges,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const lastPostRef = useRef<number>(0)

  const [userPosition, setUserPosition] = useState<GeolocationPosition | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [discoveredAreas, setDiscoveredAreas] = useState<DiscoveredPoint[]>(initialDiscovered)
  const [copied, setCopied] = useState(false)
  const [mockLat, setMockLat] = useState('50.935')
  const [mockLng, setMockLng] = useState('-1.396')
  const [mockEnabled, setMockEnabled] = useState(false)
  const [showMockPanel, setShowMockPanel] = useState(false)

  const discoveredAreasRef = useRef(discoveredAreas)
  discoveredAreasRef.current = discoveredAreas

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

    const areas = discoveredAreasRef.current
    areas.forEach(point => {
      const latlng = map.latLngToContainerPoint([point.lat, point.lng])
      const radius = 80
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(latlng.x, latlng.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }, [])

  const drawCanvasRef = useRef(drawCanvas)
  drawCanvasRef.current = drawCanvas

  const postDiscovery = useCallback(
    async (lat: number, lng: number) => {
      const now = Date.now()
      if (now - lastPostRef.current < THROTTLE_MS) return
      lastPostRef.current = now

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams/${teamId}/discover`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `JWT ${token}`,
            },
            body: JSON.stringify({ lat, lng }),
          },
        )

        if (res.ok) {
          const data = await res.json()
          if (data.added && data.discoveredAreas) {
            setDiscoveredAreas(data.discoveredAreas)
          }
        }
      } catch {
        // network error — silent
      }
    },
    [teamId, token],
  )

  // Initialize map
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

  // Render markers for all locations
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(marker => map.removeLayer(marker))
    markersRef.current.clear()

    const sorted = [...locations].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    sorted.forEach((location, index) => {
      if (!location.id || !location.latitude || !location.longitude) return

      const isCompleted = completedChallenges.includes(location.id)
      const latLng: L.LatLngTuple = [location.latitude, location.longitude]
      const marker = L.marker(latLng, {
        icon: createMarkerIcon(location, index, isCompleted),
        title: `${index + 1}. ${location.name}`,
      })
        .addTo(map)
        .bindPopup(createPopupContent(location, isCompleted), {
          className: classes.popupContainer,
        })

      markersRef.current.set(location.id, marker)
    })

    drawCanvasRef.current()
  }, [locations, completedChallenges])

  // Redraw canvas when discovered areas change
  useEffect(() => {
    drawCanvasRef.current()
  }, [discoveredAreas])

  // Geolocation watching
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

  // Mock location
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
        } as GeolocationPosition)
        setGeoError(null)
      }
    }
  }, [mockEnabled, mockLat, mockLng])

  // Discovery logic — event-driven with client-side dedup
  useEffect(() => {
    if (!userPosition) return

    const { latitude, longitude } = userPosition.coords
    const point: DiscoveredPoint = { lat: latitude, lng: longitude }

    if (isNovelPoint(point, discoveredAreasRef.current)) {
      setDiscoveredAreas(prev => [...prev, point])
      postDiscovery(latitude, longitude)
    }
  }, [userPosition, postDiscovery])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  const discoveredCount = useMemo(() => {
    return locations.filter(loc => {
      if (!loc.latitude || !loc.longitude) return false
      return discoveredAreas.some(
        p =>
          haversineDistance(p.lat, p.lng, loc.latitude, loc.longitude) <=
          (loc.discoveryRadius ?? 50),
      )
    }).length
  }, [locations, discoveredAreas])

  const totalCount = locations.length

  return (
    <div className={classes.wrapper}>
      <header className={classes.header}>
        <h1 className={classes.title}>City Challenge</h1>
        <div className={classes.stats}>
          <span className={classes.stat}>
            Discovered: {discoveredCount} / {totalCount}
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
        parts of the map — your whole team shares the discoveries!
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
