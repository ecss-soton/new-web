import React from 'react'
import Link from 'next/link'

import { Page } from '../../../payload/payload-types'
import { Button, Props as ButtonProps } from '../Button'
import { CMSLink, CMSLinkType } from '../Link'

type LinkListType = {
  links: CMSLinkType[]
}

export const LinkList: React.FC<LinkListType> = ({ links }) => {
  return (
    <div>
      {links.map((link, index) => {
        return (
          <CMSLink
            key={index}
            type={link.type}
            url={link.url}
            newTab={link.newTab}
            reference={link.reference}
            label={link.label}
            appearance={link.appearance}
            children={link.children}
            className={link.className}
            invert={link.invert}
          />
        )
      })}
    </div>
  )
}
