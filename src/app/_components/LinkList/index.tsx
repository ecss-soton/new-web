import React from 'react'

import { CMSLink, CMSLinkType } from '../Link'

type LinkListType = {
  links: CMSLinkType[]
}

export const LinkList: React.FC<LinkListType> = ({ links }) => {
  return (
    // WARNING THIS IS CURSED AND STUPID FIX THIS
    <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
      {links.map((link, index) => {
        return (
          <CMSLink
            key={index}
            type={link.type}
            url={link.url}
            newTab={link.newTab}
            reference={link.reference}
            label={link.label}
            appearance="secondary"
            children={link.children}
            className={link.className}
            invert={link.invert}
          />
        )
      })}
    </div>
  )
}
