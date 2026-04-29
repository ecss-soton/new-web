import React from 'react'
import { Metadata } from 'next'

import { getMeUser } from '../../../../_utilities/getMeUser'
import { SeatPage } from './SeatPage'

export const metadata: Metadata = {
  title: 'Seat Plan | ECSS',
  description: 'Choose your seat at the table',
}

export default async function BookingSeat({
  params,
}: {
  params: { eventSlug: string; joinCode: string }
}) {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?redirect=/booking/${params.eventSlug}/${params.joinCode}`,
  })

  return (
    <SeatPage joinCode={params.joinCode} eventSlug={params.eventSlug} user={user} token={token} />
  )
}
