'use client'

import nextDynamic from 'next/dynamic'

// Browser-only: Leaflet touches `window` at import time, so it must never be
// evaluated during SSR. next/dynamic with { ssr: false } is only honoured in a
// Client Component, hence this thin loader wrapper.
export const CityChallengeMapLoader = nextDynamic(
  () => import('./index').then(mod => mod.CityChallengeMap),
  { ssr: false },
)
