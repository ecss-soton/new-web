import React, { Fragment } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'

import { fetchComments } from '../../_api/fetchComments'
import { Button } from '../../_components/Button'
import { Gutter } from '../../_components/Gutter'
import { HR } from '../../_components/HR'
import { Input } from '../../_components/Input'
import { RenderParams } from '../../_components/RenderParams'
import { LowImpactHero } from '../../_heros/LowImpact'
import { useAuth } from '../../_providers/Auth'
import { formatDateTime } from '../../_utilities/formatDateTime'
import { getMeUser } from '../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'
import AccountForm from './AccountForm'

import classes from './index.module.scss'

export default async function Account() {
  const { user } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to access your account.',
    )}&redirect=${encodeURIComponent('/account')}`,
  })

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
                text: 'This is your account dashboard. Here you can view your account information, if there are any problems please email us at society@ecs.soton.ac.uk',
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
  description: 'Create an account or log in to your existing account.',
  openGraph: mergeOpenGraph({
    title: 'Account',
    url: '/account',
  }),
}
