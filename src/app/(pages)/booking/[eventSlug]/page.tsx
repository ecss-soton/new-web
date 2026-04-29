import React from 'react'
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { getMeUser } from '../../../_utilities/getMeUser'
import { BookingPage } from './BookingPage'

export const metadata: Metadata = {
  title: 'Table Booking | ECSS',
}

export default async function BookingEvent({ params }: { params: { eventSlug: string } }) {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?redirect=/booking/${params.eventSlug}`,
  })

  return <BookingPage user={user} token={token} eventSlug={params.eventSlug} />
}
