import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import payload from 'payload'

// Load environment variables
dotenv.config()

const run = async () => {
  // 1. Initialize Payload to access your database
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || '',
    local: true, // Local API skips authentication for the script
  })

  // 2. Read the CSV file (replace 'members.csv' with your actual file path)
  const csvFilePath = path.join(process.cwd(), 'members.csv')

  if (!fs.existsSync(csvFilePath)) {
    payload.logger.error(`Could not find CSV file at ${csvFilePath}`)
    process.exit(1)
  }

  const fileContent = fs.readFileSync(csvFilePath, 'utf-8')
  const lines = fileContent.split('\n')

  payload.logger.info(`Analyzing ${lines.length} rows...`)

  let stats = {
    totalProcessed: 0,
    matchesFound: 0,
    rolesAdded: 0,
    alreadyHadRole: 0,
    noMatch: 0,
  }

  // 3. Process each line in the CSV
  for (let i = 1; i < lines.length; i++) {
    // Starting at index 1 assumes line 0 is a header
    if (!lines[i].trim()) continue

    // Basic CSV splitting (handling commas). Adjust if your CSV values are enclosed in quotes.
    const columns = lines[i].split(',')

    if (columns.length >= 3) {
      const firstName = columns[1].trim() // 2nd column
      const lastName = columns[2].trim() // 3rd column

      stats.totalProcessed++

      // 4. Check whether a user's name contains both the first and last name
      // Note: adjust 'users' to your actual collection slug, and 'name' to the actual field containing the user's name
      const matchedUsers = await payload.find({
        collection: 'users',
        where: {
          and: [{ name: { contains: firstName } }, { name: { contains: lastName } }],
        },
      })

      if (matchedUsers.totalDocs > 0) {
        stats.matchesFound++

        for (const user of matchedUsers.docs) {
          const currentRoles = user.roles || []

          if (!currentRoles.includes('susu')) {
            await payload.update({
              collection: 'users',
              id: user.id,
              data: {
                roles: [...currentRoles, 'susu'],
              },
            })
            stats.rolesAdded++
          } else {
            stats.alreadyHadRole++
          }
        }
      } else {
        stats.noMatch++
      }
    }
  }

  payload.logger.info('\n--- Finished checking CSV against users ---')
  payload.logger.info(`Rows processed: ${stats.totalProcessed}`)
  payload.logger.info(`Matched users: ${stats.matchesFound}`)
  payload.logger.info(`New 'susu' roles added: ${stats.rolesAdded}`)
  payload.logger.info(`Users who already had role: ${stats.alreadyHadRole}`)
  payload.logger.info(`No match found: ${stats.noMatch}`)
  payload.logger.info('------------------------------------------\n')
  process.exit(0)
}

run().catch(err => {
  payload.logger.error(err)
  process.exit(1)
})
