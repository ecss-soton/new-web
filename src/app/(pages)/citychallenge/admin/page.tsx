import React from 'react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

import type { AdminProgressData } from '../../../_utilities/cityChallengeStats'
import { bungee } from '../../../_utilities/font'
import { getMeUser } from '../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../_utilities/mergeOpenGraph'
import { AdminProgressView } from './AdminProgressView'

import wrapperClasses from '../../../_components/Jumpstart/pageWrapper.module.scss'
import classes from './index.module.scss'

async function fetchProgress(token: string): Promise<AdminProgressData | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge/progress`, {
      headers: { Authorization: `JWT ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as AdminProgressData
  } catch {
    return null
  }
}

export default async function CityChallengeAdminPage() {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to access City Challenge admin.',
    )}&redirect=${encodeURIComponent('/citychallenge/admin')}`,
  })

  if (!user?.roles?.includes('admin')) {
    redirect('/citychallenge')
  }

  const data = await fetchProgress(token)

  return (
    <div className={wrapperClasses.page}>
      <div className={classes.container}>
        <header className={classes.header}>
          <h1 className={[classes.title, bungee.className].join(' ')}>City Challenge Admin</h1>
          <p className={classes.subtitle}>
            Every team&apos;s progress and per-challenge completion.
          </p>
        </header>

        {data ? (
          <AdminProgressView data={data} />
        ) : (
          <p className={classes.error} role="alert">
            We could not load team progress right now. Please try again later.
          </p>
        )}
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: 'City Challenge Admin',
  description: 'Team progress for the City Challenge.',
  openGraph: mergeOpenGraph({
    title: 'City Challenge Admin',
    url: '/citychallenge/admin',
  }),
}
