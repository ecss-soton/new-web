import React, { Fragment } from 'react'
import { Metadata } from 'next'

import type { Settings } from '../../../payload/payload-types'
import { fetchSettings } from '../../_api/fetchGlobals'
import { Button } from '../../_components/Button'
import { Gutter } from '../../_components/Gutter'
import { HR } from '../../_components/HR'
import { RenderParams } from '../../_components/RenderParams'
import { LowImpactHero } from '../../_heros/LowImpact'
import { getMeUser } from '../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'
import AccountForm from './AccountForm'

import classes from './index.module.scss'

async function getSettings(): Promise<Settings | null> {
  try {
    return await fetchSettings()
  } catch {
    return null
  }
}

export default async function Account() {
  const { user } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to access your account.',
    )}&redirect=${encodeURIComponent('/account')}`,
  })

  const settings = await getSettings()
  const contactEmail = settings?.contactEmail || 'society@ecs.soton.ac.uk'

  return (
    <Fragment>
      <Gutter>
        <RenderParams className={classes.params} />
      </Gutter>
      <LowImpactHero
        type="lowImpact"
        title="Account"
        media={null}
        richText={[
          {
            type: 'paragraph',
            children: [
              {
                text: `This is your account dashboard. Here you can view your account information, if there are any problems please email us at ${contactEmail}`,
              },
            ],
          },
        ]}
      />
      <Gutter className={classes.account}>
        <AccountForm user={user} />
        <HR />
        <Button href="/logout" appearance="secondary" label="Log out" />
      </Gutter>
    </Fragment>
  )
}

export const metadata: Metadata = {
  title: 'Account',
  description: 'Your account dashboard.',
  openGraph: mergeOpenGraph({
    title: 'Account',
    url: '/account',
  }),
}
