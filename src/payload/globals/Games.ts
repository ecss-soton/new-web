import type { GlobalConfig } from 'payload/types'

import { GAMES } from '../../utilities/games/registry'

export const Games: GlobalConfig = {
  slug: 'games',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'disabledGames',
      type: 'select',
      hasMany: true,
      options: GAMES.map(game => ({
        label: game.title,
        value: game.slug,
      })),
      admin: {
        description:
          'Disabled games are hidden from /games, their pages return 404, and they are left out of the sitemap. Scores and leaderboard preferences are kept.',
      },
    },
  ],
}
