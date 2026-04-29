import React from 'react'

import { Committee, Event, Post, Project, Society, Sponsor } from '../../../payload/payload-types'
import { CollectionArchive } from '../../_components/CollectionArchive'
import { Gutter } from '../../_components/Gutter'
import RichText from '../../_components/RichText'
import { ArchiveBlockProps } from './types'

import classes from './index.module.scss'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
  }
> = props => {
  const {
    introContent,
    id,
    relationTo,
    populateBy,
    limit,
    isJumpstart,
    populatedDocs,
    populatedDocsTotal,
    selectedDocs,
    categories,
  } = props

  const allPopulatedDocs: (
    | { relationTo: 'posts'; value: string | Post }
    | { relationTo: 'projects'; value: string | Project }
    | { relationTo: 'sponsors'; value: string | Sponsor }
    | { relationTo: 'societies'; value: string | Society }
    | { relationTo: 'committee'; value: string | Committee }
    | { relationTo: 'events'; value: string | Event }
  )[] = populatedDocs.filter(Boolean) as (
    | { relationTo: 'posts'; value: string | Post }
    | { relationTo: 'projects'; value: string | Project }
    | { relationTo: 'sponsors'; value: string | Sponsor }
    | { relationTo: 'societies'; value: string | Society }
    | { relationTo: 'committee'; value: string | Committee }
    | { relationTo: 'events'; value: string | Event }
  )[]

  return (
    <div id={`block-${id}`} className={classes.archiveBlock}>
      {introContent && (
        <Gutter className={classes.introContent}>
          <RichText content={introContent} />
        </Gutter>
      )}
      {
        <CollectionArchive
          populateBy={populateBy}
          relationTo={relationTo}
          populatedDocs={allPopulatedDocs}
          populatedDocsTotal={populatedDocsTotal}
          selectedDocs={selectedDocs}
          categories={categories}
          limit={limit}
          isJumpstart={isJumpstart}
          sort="-publishedAt"
        />
      }
    </div>
  )
}
