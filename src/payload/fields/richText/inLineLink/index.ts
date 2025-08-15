import type { RichTextCustomElement } from '@payloadcms/richtext-slate/dist/types'

import Button from './Button'
import Element from './Element'
import withInLineLink from './plugin'

const richTextInLineLink: RichTextCustomElement = {
  name: 'inline-link',
  Button,
  Element,
  plugins: [withInLineLink],
}

export default richTextInLineLink
