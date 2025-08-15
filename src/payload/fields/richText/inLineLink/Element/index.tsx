import React from 'react'

import './index.scss'

const baseClass = 'rich-text-inline-link'

const InLineLinkElement: React.FC<{
  attributes: any
  element: any
  children: React.ReactNode
}> = ({ attributes, children }) => {
  return (
    <div {...attributes}>
      <span className={baseClass}>{children}</span>
    </div>
  )
}
export default InLineLinkElement
