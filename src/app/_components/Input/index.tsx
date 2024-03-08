import React from 'react'
import { FieldValues, UseFormRegister } from 'react-hook-form'

import { InputTypeDefault } from './InputTypes/Default'
import { InputTypeEmail } from './InputTypes/Email'
import { InputTypeFile } from './InputTypes/File'
import { InputTypeTextarea } from './InputTypes/Textarea'

import classes from './index.module.scss'

type Props = {
  name: string
  label: string
  register: UseFormRegister<FieldValues & any>
  required?: boolean
  error: any
  type?: 'text' | 'textarea' | 'number' | 'password' | 'email' | 'file'
  validate?: (value: string) => boolean | string
  placeholder?: string
  disabled?: boolean
  onChange?: (value: any) => void
}

export const Input: React.FC<Props> = ({
  name,
  label,
  required,
  register,
  error,
  type = 'text',
  validate,
  placeholder,
  disabled,
  onChange,
}) => {
  let inputType: JSX.Element

  switch (type) {
    case 'email':
      inputType = (
        <InputTypeEmail
          name={name}
          required={required}
          register={register}
          error={error}
          validate={validate}
          placeholder={placeholder}
          disabled={disabled}
        />
      )
      break
    case 'textarea':
      inputType = (
        <InputTypeTextarea
          name={name}
          required={required}
          register={register}
          error={error}
          validate={validate}
          placeholder={placeholder}
          disabled={disabled}
        />
      )
      break
    case 'file':
      inputType = (
        <InputTypeFile
          name={name}
          required={required}
          register={register}
          error={error}
          validate={validate}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
        />
      )
      break
    default:
      inputType = (
        <InputTypeDefault
          name={name}
          required={required}
          register={register}
          error={error}
          type={type}
          validate={validate}
          placeholder={placeholder}
          disabled={disabled}
        />
      )
      break
  }

  return (
    <div className={classes.inputWrap}>
      <label htmlFor="name" className={classes.label}>
        {label}
        {required ? <span className={classes.asterisk}>&nbsp;*</span> : ''}
      </label>
      {inputType}
      {error && (
        <div className={classes.errorMessage}>
          {!error?.message && error?.type === 'required'
            ? 'This field is required'
            : error?.message}
        </div>
      )}
    </div>
  )
}
