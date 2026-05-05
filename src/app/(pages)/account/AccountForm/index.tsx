'use client'

import React, { Fragment, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'

import type { User } from '../../../../payload/payload-types'
import { Input } from '../../../_components/Input'
import { Message } from '../../../_components/Message'

import classes from './index.module.scss'

type FormData = {
  email: string
  name: string
}

const AccountForm: React.FC<{ user: User }> = ({ user }) => {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const {
    register,
    formState: { errors },
    reset,
  } = useForm<FormData>()

  const router = useRouter()

  useEffect(() => {
    if (user === null) {
      router.push(
        `/login?error=${encodeURIComponent(
          'You must be logged in to view this page.',
        )}&redirect=${encodeURIComponent('/account')}`,
      )
    }

    // Once user is loaded, reset form to have default values
    if (user) {
      reset({
        email: user.email,
        name: user.name,
      })
    }
  }, [user, router, reset])

  return (
    <form className={classes.form}>
      <Message error={error} success={success} className={classes.message} />
      <Fragment>
        <Input
          name="email"
          label="Email Address"
          disabled={true}
          register={register}
          error={errors.email}
          type="email"
        />
        <Input name="name" label="Name" register={register} error={errors.name} disabled={true} />
      </Fragment>
    </form>
  )
}

export default AccountForm
