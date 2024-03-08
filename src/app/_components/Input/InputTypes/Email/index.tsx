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

export const InputTypeEmail: React.FC<Props> = ({
  name,
  required,
  register,
  error,
  validate,
  placeholder,
  disabled,
}) => {
  return (
    <input
      className={[classes.input, error && classes.error].filter(Boolean).join(' ')}
      type={'email'}
      placeholder={placeholder}
      {...register(name, {
        required,
        validate,
        pattern: {
          value: /\S+@\S+\.\S+/,
          message: 'Please enter a valid email',
        },
      })}
      disabled={disabled}
    />
  )
}
