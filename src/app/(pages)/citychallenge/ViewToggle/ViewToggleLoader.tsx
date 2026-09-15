'use client'

import nextDynamic from 'next/dynamic'

// Uses useSearchParams, so it is loaded client-side only via a Client Component.
export const CityChallengeViewToggleLoader = nextDynamic(
  () => import('./index').then(mod => mod.CityChallengeViewToggle),
  { ssr: false },
)
