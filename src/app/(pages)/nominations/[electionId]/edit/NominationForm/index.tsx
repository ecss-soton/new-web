'use client'

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import RichTextField from '@payloadcms/richtext-slate/dist/field'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createEditor } from 'slate'
import { Editable, Slate, withReact } from 'slate-react'

import { Media as MediaType, Nomination } from '../../../../../../payload/payload-types'
import { Button } from '../../../../../_components/Button'
import { Input } from '../../../../../_components/Input'
import { Media } from '../../../../../_components/Media'
import { Image } from '../../../../../_components/Media/Image'
import { Message } from '../../../../../_components/Message'
import { useAuth } from '../../../../../_providers/Auth'

import classes from './index.module.scss'

type FormData = {
  nickname?: string
  manifesto?: string
  image?: string
}

const NominationForm: React.FC<{ nominationId?: string }> = props => {
  const { nominationId } = props
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [nomination, setNomination] = useState<Nomination | null>(null)
  const [currentPicture, setCurrentPicture] = useState<MediaType | null>(null)

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

  useEffect(() => {
    const findNomination = async () => {
      if (!nomination) {
        try {
          const req = await fetch(
            `${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations/${nominationId}`,
          )

          const json = await req.json()

          setNomination(json as Nomination)
        } catch (err) {
          console.warn(err) // eslint-disable-line no-console
        }
      }
    }

    findNomination().then(() => {
      if (nomination) {
        setCurrentPicture(nomination.image as MediaType)
        reset({
          nickname: nomination.nickname,
          manifesto: nomination.manifesto,
        })
      }
    })
  }, [nomination, nominationId, reset])

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (data?.image) {
        const formData = new FormData()
        console.log(data.image)
        formData.append('file', data.image[0])
        formData.append('alt', 'nominee picture')
        const media = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/media`, {
          // Make sure to include cookies with fetch
          credentials: 'include',
          method: 'POST',
          body: formData,
        })

        const mediaID = (await media.json()) as { doc: MediaType }
        console.log(mediaID)
        data.image = mediaID.doc.id
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations/${nominationId}`,
        {
          // Make sure to include cookies with fetch
          credentials: 'include',
          method: 'PATCH',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

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
    [nominationId, router],
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={classes.form}>
      <Message error={error} success={success} className={classes.message} />
      <Fragment>
        {nomination &&
          nomination.populatedNominees.map(n => {
            const email = `${n.username}@soton.ac.uk`
            return (
              <Link key={n.id} href={`mailto:${email}`}>
                {n.name}
              </Link>
            )
          })}
        <p>URL to give to anyone who you want to join your nomination</p>
        <span>{`${process.env.NEXT_PUBLIC_SERVER_URL}/nominations/${nomination?.id}/join/${nomination?.joinUUID}`}</span>
        <p>Edit your nomination below</p>
        <Input
          name="nickname"
          label="Nickname"
          register={register}
          error={errors.nickname}
          type="text"
        />
        <input type="file" {...register('image')} onChange={onChangePicture} />
        {errors.image && <p>Please select an image</p>}
        {picture && <img className="image" src={picture} alt="" />}
        {!picture && currentPicture && (
          <Media resource={currentPicture} imgClassName={classes.image} />
        )}
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
        label={isLoading ? 'Processing' : 'Update Nomination'}
        disabled={isLoading}
        appearance="primary"
        className={classes.submit}
      />
    </form>
  )
}

export default NominationForm
