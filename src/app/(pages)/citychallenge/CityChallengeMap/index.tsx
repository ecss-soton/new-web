'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'

import type { CityChallengeLocation } from '../../../../payload/payload-types'

import 'leaflet/dist/leaflet.css'

import classes from './index.module.scss'

const SOUTHAMPTON: L.LatLngTuple = [50.935, -1.396]
const THROTTLE_MS = 8000
const MAX_DISCOVERY_BATCH = 200

// Geographic grid cell size in degrees. Must match the value in CityChallengeTeams.ts
// and the City Challenge page. At Southampton (~51°N): ≈222 m latitude, ≈140 m longitude.
const CELL_DEG = 0.002

function latLngToCell(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL_DEG)}:${Math.floor(lng / CELL_DEG)}`
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

  // Determine destination: CMS link takes priority over a generated Google Maps URL.
  let destinationHref: string | null = null
  let destinationLabel = 'Get me there →'
  if (location.link) {
    try {
      const parsed = new URL(location.link)
      if (parsed.protocol === 'https:') {
        destinationHref = parsed.href
        destinationLabel = 'Open link now'
      }
    } catch {
      // invalid URL — ignore
    }
  }
  if (
    !destinationHref &&
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number'
  ) {
    destinationHref = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
  }

  if (destinationHref) {
    const link = document.createElement('a')
    link.className = classes.popupLink
    link.href = destinationHref
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = destinationLabel
    popup.append(link)
  }

  return popup
}

type Props = {
  locations: CityChallengeLocation[]
  isAdmin?: boolean
  teamId: string
  token: string
  /** Array of discovered cell IDs in the form "latIdx:lngIdx". */
  discoveredAreas: string[]
  completedChallenges: string[]
  error?: string | null
}

type Point = { lat: number; lng: number }

export const CityChallengeMap: React.FC<Props> = ({
  locations,
  isAdmin,
  teamId,
  token,
  discoveredAreas: initialDiscovered,
  completedChallenges,
  error: locationsError,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Discovery queue — positions are buffered so the throttle never drops a cell.
  const pendingRef = useRef<Point[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFlushRef = useRef<number>(0)
  const flushingRef = useRef<boolean>(false)

  const [userPosition, setUserPosition] = useState<GeolocationPosition | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [discoveredAreas, setDiscoveredAreas] = useState<string[]>(initialDiscovered)
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
    if (!container.clientWidth || !container.clientHeight) return

    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cells = discoveredAreasRef.current

    // 1. Fill the entire canvas with the dark fog overlay.
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(18, 18, 20, 0.85)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 2. Subtle grid texture on the fog (pixel grid, purely decorative).
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
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

    // 3. Hint text before any cell has been discovered.
    if (cells.length === 0) {
      ctx.font = '13px Inter, sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.textAlign = 'center'
      ctx.fillText('Move around to reveal hidden locations', canvas.width / 2, canvas.height - 24)
    }

    // 4. Erase fog pixels for each discovered geographic cell, revealing the map
    //    tiles underneath. Cells are stable across pan and zoom because they are
    //    derived from geographic coordinates, not screen pixels.
    if (cells.length > 0) {
      ctx.globalCompositeOperation = 'destination-out'
      cells.forEach(cellId => {
        const parts = cellId.split(':')
        if (parts.length !== 2) return
        const latIdx = Number(parts[0])
        const lngIdx = Number(parts[1])
        if (isNaN(latIdx) || isNaN(lngIdx)) return

        const latMin = latIdx * CELL_DEG
        const latMax = (latIdx + 1) * CELL_DEG
        const lngMin = lngIdx * CELL_DEG
        const lngMax = (lngIdx + 1) * CELL_DEG

        // Leaflet: latitude increases upward, so the "top" of the cell is latMax.
        const topLeft = map.latLngToContainerPoint([latMax, lngMin])
        const bottomRight = map.latLngToContainerPoint([latMin, lngMax])

        ctx.fillStyle = 'rgba(0,0,0,1)'
        ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
      })
      ctx.globalCompositeOperation = 'source-over'
    }
  }, [])

  const drawCanvasRef = useRef(drawCanvas)
  drawCanvasRef.current = drawCanvas

  const flushDiscoveries = useCallback(async () => {
    if (flushingRef.current) return
    const batch = pendingRef.current.splice(0, MAX_DISCOVERY_BATCH)
    if (batch.length === 0) return

    flushingRef.current = true
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-teams/${teamId}/discover`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `JWT ${token}`,
          },
          body: JSON.stringify({ points: batch }),
        },
      )

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.discoveredAreas)) {
          // Union with any cells added optimistically since the request started.
          setDiscoveredAreas(prev =>
            Array.from(new Set([...prev, ...(data.discoveredAreas as string[])])),
          )
        }
        setSyncError(null)
      } else {
        pendingRef.current.unshift(...batch)
        setSyncError('Discoveries are not syncing — will retry.')
      }
    } catch {
      pendingRef.current.unshift(...batch)
      setSyncError('Discoveries are not syncing — will retry.')
    } finally {
      flushingRef.current = false

      // Trailing flush: guarantee buffered positions are eventually sent.
      if (pendingRef.current.length > 0 && !flushTimerRef.current) {
        const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastFlushRef.current))
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null
          lastFlushRef.current = Date.now()
          flushDiscoveriesRef.current()
        }, wait)
      }
    }
  }, [teamId, token])

  const flushDiscoveriesRef = useRef(flushDiscoveries)
  flushDiscoveriesRef.current = flushDiscoveries

  const enqueueDiscovery = useCallback((lat: number, lng: number) => {
    pendingRef.current.push({ lat, lng })
    if (flushTimerRef.current) return

    const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastFlushRef.current))
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      lastFlushRef.current = Date.now()
      flushDiscoveriesRef.current()
    }, wait)
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: SOUTHAMPTON,
      zoom: 15,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    mapRef.current = map

    const mapContainer = map.getContainer()
    const canvas = document.createElement('canvas')
    canvas.className = classes.fogCanvas
    canvas.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;z-index:450;pointer-events:none;'
    mapContainer.appendChild(canvas)
    canvasRef.current = canvas

    const handleMove = () => drawCanvasRef.current()
    const handleResize = () => {
      map.invalidateSize()
      drawCanvasRef.current()
    }
    map.on('moveend', handleMove)
    map.on('zoomend', handleMove)
    window.addEventListener('resize', handleResize)

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null
    resizeObserver?.observe(mapContainer)

    initTimerRef.current = setTimeout(() => drawCanvasRef.current(), 300)

    return () => {
      if (initTimerRef.current) clearTimeout(initTimerRef.current)
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect()
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
      if (
        !location.id ||
        typeof location.latitude !== 'number' ||
        typeof location.longitude !== 'number'
      )
        return

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

  // Discovery logic — check cell novelty, optimistically update locally, then queue for sync.
  useEffect(() => {
    if (!userPosition) return

    const { latitude, longitude } = userPosition.coords
    const cellId = latLngToCell(latitude, longitude)

    if (!discoveredAreasRef.current.includes(cellId)) {
      setDiscoveredAreas(prev => (prev.includes(cellId) ? prev : [...prev, cellId]))
      enqueueDiscovery(latitude, longitude)
    }
  }, [userPosition, enqueueDiscovery])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  // A location is "discovered" when the team has revealed the grid cell it sits in.
  const discoveredCount = useMemo(() => {
    return locations.filter(loc => {
      if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return false
      return discoveredAreas.includes(latLngToCell(loc.latitude, loc.longitude))
    }).length
  }, [locations, discoveredAreas])

  const totalCount = locations.filter(
    loc => typeof loc.latitude === 'number' && typeof loc.longitude === 'number',
  ).length

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
          {syncError && (
            <span className={classes.geoError} role="status">
              {syncError}
            </span>
          )}
        </div>
      </header>
      <p className={classes.intro}>
        Explore Southampton to uncover city challenges hidden around you.
      </p>
      <div className={classes.mapContainer}>
        {locationsError ? (
          <div className={classes.empty} role="alert">
            {locationsError}
          </div>
        ) : totalCount === 0 ? (
          <div className={classes.empty}>No locations available yet.</div>
        ) : (
          <div ref={mapContainerRef} className={classes.map} />
        )}
      </div>
      <div className={classes.legend} role="note" aria-label="Map legend">
        <span className={classes.legendItem}>
          <span className={classes.legendFog} aria-hidden="true" />
          Unexplored
        </span>
        <span className={classes.legendItem}>
          <span className={classes.legendRevealed} aria-hidden="true" />
          Discovered
        </span>
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
