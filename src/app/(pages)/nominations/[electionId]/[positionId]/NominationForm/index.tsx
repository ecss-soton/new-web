'use client'

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import RichTextField from '@payloadcms/richtext-slate/dist/field'
import { useRouter } from 'next/navigation'
import { createEditor } from 'slate'
import { Editable, Slate, withReact } from 'slate-react'

import { Media, Nomination } from '../../../../../../payload/payload-types'
import { Button } from '../../../../../_components/Button'
import { Input } from '../../../../../_components/Input'
import { Image } from '../../../../../_components/Media/Image'
import { Message } from '../../../../../_components/Message'
import { useAuth } from '../../../../../_providers/Auth'

import classes from './index.module.scss'

type FormData = {
  nickname?: string
  manifesto?: string
  image?: string
}

const NominationForm: React.FC<{ electionId?: string; positionId?: string }> = props => {
  const { electionId, positionId } = props
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isLoading },
    reset,
    watch,
  } = useForm<FormData>()

  const router = useRouter()
  const [richText, setRichText] = useState([
    {
      type: 'paragraph',
      children: [{ text: 'A line of text in a paragraph.' }],
    },
  ])
  const [picture, setPicture] = useState(null)
  const onChangePicture = e => {
    setPicture(URL.createObjectURL(e.target.files[0]))
  }

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (data?.image && data.image?.length === 1) {
        const formData = new FormData()
        formData.append('file', data.image[0])
        formData.append('alt', 'nominee picture')
        const media = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/media`, {
          // Make sure to include cookies with fetch
          credentials: 'include',
          method: 'POST',
          body: formData,
        })

        const mediaID = (await media.json()) as { doc: Media }
        data.image = mediaID.doc.id
      } else {
        data.image = undefined
      }

      if (data.nickname === '') {
        data.nickname = undefined
      }

      let postData = data
      postData['election'] = electionId
      postData['position'] = positionId

      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations`, {
        // Make sure to include cookies with fetch
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify(postData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const {
          doc: { id },
        } = (await response.json()) as { doc: Nomination }
        setSuccess('Successfully created a nomination.')
        router.push(`/nominations/${id}`)
      } else {
        setError('There was a problem creating your nomination.')
      }
    },
    [electionId, positionId, router],
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={classes.form}>
      <Message error={error} success={success} className={classes.message} />
      <Fragment>
        <p>Create your nomination below</p>
        <Input
          name="nickname"
          label="Nickname"
          register={register}
          error={errors.nickname}
          type="text"
        />
        <Input
          name={'image'}
          label={'Profile Picture'}
          register={register}
          error={errors.image}
          type="file"
          onChange={onChangePicture}
        />
        {errors.image && <p>Please select an image</p>}
        {picture && <img className="image" src={picture} alt="" />}
        <Input
          name="manifesto"
          label="Manifesto"
          register={register}
          error={errors.manifesto}
          type="textarea"
        />
      </Fragment>
      <Button
        type="submit"
        label={isLoading ? 'Processing' : 'Create Nomination'}
        disabled={isLoading}
        appearance="primary"
        className={classes.submit}
      />
    </form>
  )
}

export default NominationForm
