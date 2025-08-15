import type { RichTextElement } from '@payloadcms/richtext-slate/dist/types'

import inLineLink from './inLineLink'
import label from './label'
import largeBody from './largeBody'

const elements: RichTextElement[] = [
  'blockquote',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  largeBody,
  label,
  inLineLink,
]

export default elements
