'use client'

import React, { Fragment, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '../../../../../../_components/Button'
import { Input } from '../../../../../../_components/Input'
import { Message } from '../../../../../../_components/Message'

import classes from './index.module.scss'

async function joinNomination(
  router: AppRouterInstance,
  nominationId: string,
  joinKey: string,
  setError,
) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations/${nominationId}/join/${joinKey}`,
      {
        method: 'POST',
        credentials: 'include',
      },
    )
    const json = await res.json()
    console.log(json)
    if (json?.success) {
      router.push(`/nominations/${nominationId}`)
    }
    if (json?.error) {
      setError(json.error)
    }
  } catch (err) {
    console.log(err)
  }
}

export const JoinNominationForm: React.FC<{ nominationId?: string; joinKey?: string }> = params => {
  const { nominationId, joinKey } = params
  const router = useRouter()
  const [error, setError] = useState<string>('')

  return (
    <Fragment>
      <Button
        appearance="primary"
        label="Join Nomination"
        onClick={async () => {
          await joinNomination(router, nominationId, joinKey, setError)
        }}
      />
      {error && <p>{error}</p>}
    </Fragment>
  )
}
