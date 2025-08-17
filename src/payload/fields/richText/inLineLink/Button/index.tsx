/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line no-use-before-define
import React from 'react'
import LeafButton from '@payloadcms/richtext-slate/dist/field/leaves/Button'

import Icon from '../Icon'

const baseClass = 'rich-text-inline-link-button'

const ToolbarButton: React.FC<{ path: string }> = () => (
  <LeafButton format="inline-link">
    <Icon />
  </LeafButton>
)

export default ToolbarButton
