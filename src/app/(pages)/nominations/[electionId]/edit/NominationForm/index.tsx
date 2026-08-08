'use client'

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import RichTextField from '@payloadcms/richtext-slate/dist/field'
import NextImage, { StaticImageData } from 'next/image'
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
  droppedOut: boolean
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
    formState: { errors, isSubmitting },
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
  const pictureWatch: FileList = watch('image') as unknown as FileList
  useEffect(() => {
    if (!pictureWatch || !pictureWatch[0]) return
    setPicture(URL.createObjectURL(pictureWatch[0]))
  }, [pictureWatch])

  const onChangePicture = e => {
    setPicture(URL.createObjectURL(e.target.files[0]))
  }

  useEffect(() => {
    let cancelled = false

    const findNomination = async () => {
      try {
        const req = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations/${nominationId}`,
        )
        if (!req.ok) throw new Error('Nomination not found')

        const json = (await req.json()) as Nomination
        if (!cancelled) {
          setNomination(json)
        }
      } catch {
        if (!cancelled) {
          setError('This nomination could not be loaded.')
        }
      }
    }

    findNomination()
    return () => {
      cancelled = true
    }
  }, [nominationId])

  useEffect(() => {
    if (!nomination) return

    setCurrentPicture(nomination.image as MediaType)
    reset({
      nickname: nomination.nickname,
      manifesto: nomination.manifesto,
      droppedOut: nomination.droppedOut,
    })
  }, [nomination, reset])

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (data?.image && data?.image[0]) {
        const formData = new FormData()
        formData.append('file', data.image[0])
        formData.append('alt', 'nominee picture')
        const media = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/media`, {
          // Make sure to include cookies with fetch
          credentials: 'include',
          method: 'POST',
          body: formData,
        })

        const mediaID = (await media.json()) as { doc: MediaType }
        data.image = mediaID.doc.id
      } else {
        data.image = undefined
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
        setSuccess('Successfully edited the nomination.')
        router.push(`/nominations/${id}`)
      } else {
        setError('There was a problem editing your nomination.')
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
            const domain = `${n.username}@soton.ac.uk`
            return (
              <Link key={n.id} href={`mailto:${domain}`}>
                {n.name}
              </Link>
            )
          })}
        <p>If you want to run on a joint ticket, use this URL to do so</p>
        <span>{`${process.env.NEXT_PUBLIC_SERVER_URL}/nominations/${nomination?.id}/join/${nomination?.joinUUID}`}</span>
        <p>Edit your nomination below</p>
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
        {picture && <NextImage className="image" src={picture} width={300} height={300} alt="" />}
        Image
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
        <span>
          Dropped out
          <input name="droppedOut" type="checkbox" {...register('droppedOut')} />
        </span>
      </Fragment>
      <Button
        type="submit"
        label={isSubmitting ? 'Processing' : 'Update Nomination'}
        disabled={isSubmitting}
        appearance="primary"
        className={classes.submit}
      />
    </form>
  )
}

export default NominationForm
