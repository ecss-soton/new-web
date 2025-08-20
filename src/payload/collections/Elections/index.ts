import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { publishedOrAdmin } from '../ElectionResults/access/publishedOrAdmin'
import Groups from '../groups'
import { electionResults } from './endpoints/results'
import { checkNominations } from './hooks/checkNominations'
import { countVotes } from './hooks/checkVotes'
import { PrettyPrintLink } from './react/prettyPrintLink'
import {
  isAfterNomination,
  isNominationConstitutional,
  isVotingConstitutional,
} from './validate/dateValidate'

const Elections: CollectionConfig = {
  slug: 'elections',
  access: {
    read: publishedOrAdmin,
    readVersions: admins,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.Elections,
    defaultColumns: ['name', 'nominationStart', 'votingEnd', 'positions'],
  },
  versions: {
    drafts: true,
  },
  endpoints: [
    {
      path: '/:id/results',
      method: 'get',
      handler: electionResults,
    },
  ],
  fields: [
    {
      name: 'prettyPrint',
      type: 'ui',
      admin: {
        components: {
          Field: PrettyPrintLink,
        },
      },
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'nominationStart',
      label: 'Nomination Start Time',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'nominationEnd',
      label: 'Nomination End Time',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      validate: isNominationConstitutional,
    },
    {
      name: 'votingStart',
      label: 'Voting Start Time',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      hooks: {
        afterChange: [checkNominations],
      },
      validate: isAfterNomination,
      required: true,
    },
    {
      name: 'votingEnd',
      label: 'Voting End Time',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      hooks: {
        afterChange: [countVotes],
      },
      validate: isVotingConstitutional,
      required: true,
    },
    {
      name: 'positions',
      type: 'relationship',
      required: true,
      relationTo: 'positions',
      hasMany: true,
      admin: {
        allowCreate: true,
      },
    },
  ],
}

export default Elections
