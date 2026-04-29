import React from 'react'
import { Metadata } from 'next'

import { getMeUser } from '../../../_utilities/getMeUser'
import { SeatPage } from './SeatPage'

export const metadata: Metadata = {
  title: 'Seat Plan | ECSS',
  description: 'Choose your seat at the table',
}

export default async function BookingSeat({ params }: { params: { code: string } }) {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?redirect=/booking/${params.code}`,
  })

  return <SeatPage code={params.code} user={user} token={token} />
}
