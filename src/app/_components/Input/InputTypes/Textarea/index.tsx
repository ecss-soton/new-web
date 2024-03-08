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
}

export const InputTypeTextarea: React.FC<Props> = ({
  name,
  required,
  register,
  error,
  validate,
  placeholder,
  disabled,
}) => {
  return (
    <textarea
      className={[classes.input, classes.textarea, error && classes.error]
        .filter(Boolean)
        .join(' ')}
      rows={3}
      placeholder={placeholder}
      {...register(name, {
        required,
        validate,
      })}
      disabled={disabled}
    />
  )
}
