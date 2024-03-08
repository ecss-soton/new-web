import React from 'react'
import { FieldValues, UseFormRegister } from 'react-hook-form'

import classes from '../../index.module.scss'

type Props = {
  name: string
  register: UseFormRegister<FieldValues & any>
  required?: boolean
  error: any
  validate?: (value: string) => boolean | string
  placeholder?: string
  disabled?: boolean
  onChange?: (value: any) => void
}

export const InputTypeFile: React.FC<Props> = ({
  name,
  required,
  register,
  error,
  validate,
  placeholder,
  disabled,
  onChange,
}) => {
  return (
    <input
      className={[classes.input, error && classes.error].filter(Boolean).join(' ')}
      type={'file'}
      placeholder={placeholder}
      {...register(name, {
        required,
        validate,
      })}
      disabled={disabled}
      // Maybe expand in the future, see https://www.iana.org/assignments/media-types/media-types.xhtml#image
      // Images are displayed using https://nextjs.org/docs/app/building-your-application/optimizing/images
      accept={"image/png, image/jpeg"}
      onChange={onChange}
    />
  )
}
