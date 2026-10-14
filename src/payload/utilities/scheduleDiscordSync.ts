import { scheduleJob } from 'node-schedule'
import type { Payload } from 'payload'

import { syncDiscordEvents } from './discordSync'

const JOB_NAME = 'discord-event-sync'
// Every 20 minutes by default. Override with `DISCORD_SYNC_CRON`.
const DEFAULT_CRON = '*/20 * * * *'

/**
 * Register the recurring Discord interest-count sync. No-ops unless a bot
 * token is configured. Safe to call once from the server `onInit` hook.
 */
export function scheduleDiscordSync(payload: Payload): void {
  const cron = process.env.DISCORD_SYNC_CRON || DEFAULT_CRON

  if (!process.env.DISCORD_BOT_TOKEN) return

  scheduleJob(JOB_NAME, cron, () => {
    void syncDiscordEvents(payload).catch(error => {
      payload.logger.error(`Discord sync job failed: ${String(error)}`)
    })
  })

  payload.logger.info(`Discord event sync scheduled (${cron})`)
}
