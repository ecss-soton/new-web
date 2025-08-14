import React from 'react'

import {
  Committee,
  Event,
  JumpstartEvent,
  Post,
  Project,
  Society,
  Sponsor,
} from '../../../payload/payload-types'
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

  // const isPosts = (doc: any): doc is (Post | string) => relationTo === 'posts'
  // const isProjects = (doc: any): doc is (Project | string) => relationTo === 'projects'
  //
  // const gg = isPosts(populatedDocs[0].value) ? populatedDocs[0].value : null
  //
  // .map((doc) => {
  //   isPosts(doc.value) || isProjects(doc.value)
  //
  //   if (isPosts(doc.value)) {
  //     return {relationTo: "posts", value: doc.value}
  //   } else if (isProjects(doc.value)) {
  //     return {relationTo: "projects", value: doc.value}
  //   }
  //   return null
  // })

  const allPopulatedDocs: (
    | { relationTo: 'posts'; value: string | Post }
    | { relationTo: 'projects'; value: string | Project }
    | { relationTo: 'sponsors'; value: string | Sponsor }
    | { relationTo: 'societies'; value: string | Society }
    | { relationTo: 'committee'; value: string | Committee }
    | { relationTo: 'events'; value: string | Event }
    | { relationTo: 'jumpstartEvents'; value: string | JumpstartEvent }
  )[] = populatedDocs.filter(Boolean) as (
    | { relationTo: 'posts'; value: string | Post }
    | { relationTo: 'projects'; value: string | Project }
    | { relationTo: 'sponsors'; value: string | Sponsor }
    | { relationTo: 'societies'; value: string | Society }
    | { relationTo: 'committee'; value: string | Committee }
    | { relationTo: 'events'; value: string | Event }
    | { relationTo: 'jumpstartEvents'; value: string | JumpstartEvent }
  )[]

  return (
    <div id={`block-${id}`} className={classes.archiveBlock}>
      {introContent && (
        <Gutter className={classes.introContent}>
          <RichText content={introContent} />
        </Gutter>
      )}
      {/* {relationTo === 'societies' && <SocietyArchive limit={limit} />}
      {relationTo === 'committee' && <CommitteeArchive />}
      {relationTo === 'sponsors' && <SponsorArchive />} */}
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
