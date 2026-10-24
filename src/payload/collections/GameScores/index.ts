import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import type { User } from '../../payload-types'
import { leaderboard } from './endpoints/leaderboard'
import { submit } from './endpoints/submit'

const GameScores: CollectionConfig = {
  slug: 'game-scores',
  access: {
    // Anonymous users see nothing; authenticated users see their own scores; admins see all.
    // Writes go through /submit so scores are always validated server-side.
    read: ({ req: { user: reqUser } }) => {
      if (!reqUser) return false
      if ((reqUser as User).roles?.includes('admin')) return true
      return { user: { equals: reqUser.id } }
    },
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'entryKey',
    defaultColumns: ['game', 'user', 'date', 'score'],
  },
  fields: [
    {
      name: 'entryKey',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'game:userId:dayKey — one score per user per game per day.',
      },
    },
    {
      name: 'game',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Game id from src/utilities/games/registry.ts.',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
    },
    {
      name: 'date',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Europe/London day key (YYYY-MM-DD).',
      },
    },
    {
      name: 'solved',
      type: 'checkbox',
      required: true,
    },
    {
      name: 'completed',
      type: 'checkbox',
      required: true,
      defaultValue: true,
    },
    {
      name: 'score',
      type: 'number',
      required: true,
      admin: {
        description: 'Game-defined score; see the matching leaderboard config.',
      },
    },
    {
      name: 'metrics',
      type: 'json',
      admin: {
        description: 'Optional game-specific details for admins/debugging.',
      },
    },
  ],
  endpoints: [
    {
      path: '/submit',
      method: 'post',
      handler: submit,
    },
    {
      path: '/leaderboard',
      method: 'get',
      handler: leaderboard,
    },
  ],
}

export default GameScores
