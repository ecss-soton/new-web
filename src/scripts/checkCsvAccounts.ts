import dotenv from 'dotenv'
import path from 'path'
import payload from 'payload'

import {
  logCsvAccountCheckResult,
  runCheckCsvAccountsFromFile,
} from '../payload/utilities/checkCsvAccounts'

// Load environment variables
dotenv.config()

const run = async (): Promise<void> => {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || '',
    local: true,
  })

  const csvFilePath = path.join(process.cwd(), 'members.csv')

  const result = await runCheckCsvAccountsFromFile({
    payload,
    csvFilePath,
    role: 'susu',
  })

  logCsvAccountCheckResult(payload, result)
  process.exit(0)
}

run().catch(err => {
  payload.logger.error(err)
  process.exit(1)
})
