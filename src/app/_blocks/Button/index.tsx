import React from 'react'

import { Page } from '../../../payload/payload-types'
import { Button } from '../../_components/Button'
import { Gutter } from '../../_components/Gutter'
import { CMSLink } from '../../_components/Link'
import RichText from '../../_components/RichText'

import classes from './index.module.scss'

type Props = Extract<Page['layout'][0], { blockType: 'button' }>

export const ButtonBlock: React.FC<
  Props & {
    id?: string
  }
> = props => {
  const { text, link, appearance } = props

  //   console.log("YAMOOOOOOO")

  return (
    <Gutter>
      <Button appearance={appearance} label={text} href={link}></Button>
    </Gutter>
  )
}
