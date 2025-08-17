import type { RichTextCustomLeaf } from '@payloadcms/richtext-slate/dist/types'

import Button from './Button'
import Leaf from './Leaf'
import withInLineLink from './plugin'

const richTextInLineLink: RichTextCustomLeaf = {
  name: 'inline-link',
  Button,
  Leaf,
  plugins: [withInLineLink],
}

export default richTextInLineLink
