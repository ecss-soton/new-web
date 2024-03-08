import React from 'react'
import { FieldValues, UseFormRegister } from 'react-hook-form'

import classes from '../../index.module.scss'

type Props = {
  name: string
  register: UseFormRegister<FieldValues & any>
  required?: boolean
  error: any
  type?: 'text' | 'textarea' | 'number' | 'password' | 'email' | 'file'
  validate?: (value: string) => boolean | string
  placeholder?: string
  disabled?: boolean
}

export const InputTypeDefault: React.FC<Props> = ({
  name,
  required,
  register,
  error,
  type = 'text',
  validate,
  placeholder,
  disabled,
}) => {
  return (
    <input
      className={[classes.input, error && classes.error].filter(Boolean).join(' ')}
      type={type}
      placeholder={placeholder}
      {...register(name, {
        required,
        validate,
      })}
      disabled={disabled}
    />
  )
}
