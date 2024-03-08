'use client'

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'

import type { User } from '../../../../payload/payload-types'
import { Button } from '../../../_components/Button'
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
  // const { user, setUser } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isLoading },
    reset,
    watch,
  } = useForm<FormData>()

  const router = useRouter()

  // const onSubmit = useCallback(
  //   async (data: FormData) => {
  //     if (user) {
  //       const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/${user.id}`, {
  //         // Make sure to include cookies with fetch
  //         credentials: 'include',
  //         method: 'PATCH',
  //         body: JSON.stringify(data),
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //       })
  //
  //       if (response.ok) {
  //         const json = await response.json()
  //         setUser(json.doc)
  //         setSuccess('Successfully updated account.')
  //         setError('')
  //         setChangePassword(false)
  //         reset({
  //           email: json.doc.email,
  //           name: json.doc.name,
  //           password: '',
  //           passwordConfirm: '',
  //         })
  //       } else {
  //         setError('There was a problem updating your account.')
  //       }
  //     }
  //   },
  //   [user, setUser, reset],
  // )

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
    // <form onSubmit={handleSubmit(onSubmit)} className={classes.form}>
    <form className={classes.form}>
      <Message error={error} success={success} className={classes.message} />
      <Fragment>
        <Input
          name="email"
          label="Email Address"
          // required
          disabled={true}
          register={register}
          error={errors.email}
          type="email"
        />
        <Input name="name" label="Name" register={register} error={errors.name} disabled={true} />
      </Fragment>
      {/*<Button*/}
      {/*  type="submit"*/}
      {/*  label={isLoading ? 'Processing' : changePassword ? 'Change Password' : 'Update Account'}*/}
      {/*  disabled={isLoading}*/}
      {/*  appearance="primary"*/}
      {/*  className={classes.submit}*/}
      {/*/>*/}
    </form>
  )
}

export default AccountForm
