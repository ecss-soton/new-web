import React from 'react'
import { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getMeUser } from '../../_utilities/getMeUser'
import { BookingPage } from './BookingPage'

export const metadata: Metadata = {
  title: 'Table Booking | ECSS',
  description: 'Book your table for the event',
}

export default async function Booking() {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?redirect=/booking`,
  })

  return <BookingPage user={user} token={token} />
}
