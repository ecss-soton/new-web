import React from 'react'

import './index.scss'

const baseClass = 'rich-text-inline-link'

const InLineLinkLeaf: React.FC<{
  attributes: any
  leaf: any
  children: React.ReactNode
}> = ({ attributes, leaf, children }) => {
  // Check if this leaf has the inline link formatting
  if (leaf['inline-link'] || leaf.inlineLink) {
    return (
      <span {...attributes} className={baseClass}>
        {children}
      </span>
    )
  }

  // If not an inline link, render normally
  return <span {...attributes}>{children}</span>
}

export default InLineLinkLeaf
