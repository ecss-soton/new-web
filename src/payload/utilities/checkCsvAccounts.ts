import fs from 'fs'
import type { Payload } from 'payload'

interface PayloadLike {
  find: Payload['find']
  update: Payload['update']
  logger: Payload['logger']
}

interface UserFindResult {
  docs: Array<{ id: string | number; roles?: Array<'admin' | 'user' | 'susu'> }>
  totalDocs: number
}

export interface CsvAccountCheckStats {
  totalProcessed: number
  matchedRows: number
  rolesAdded: number
  alreadyHadRole: number
  noMatch: number
  invalidRows: number
}

export interface CsvAccountCheckResult {
  stats: CsvAccountCheckStats
}

const parseCsvRow = (line: string): string[] => {
  const columns: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        index++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      columns.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  columns.push(current.trim())
  return columns
}

export const checkCsvAccountsFromContent = async ({
  payload,
  csvContent,
  role = 'susu',
}: {
  payload: PayloadLike
  csvContent: string
  role?: 'admin' | 'user' | 'susu'
}): Promise<CsvAccountCheckResult> => {
  const lines = csvContent.split(/\r?\n/)

  payload.logger.info(`Analyzing ${lines.length} rows...`)

  const stats: CsvAccountCheckStats = {
    totalProcessed: 0,
    matchedRows: 0,
    rolesAdded: 0,
    alreadyHadRole: 0,
    noMatch: 0,
    invalidRows: 0,
  }

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]

    if (!line.trim()) {
      continue
    }

    const columns = parseCsvRow(line)
    // 0: User ID, 1: First Name, 2: Last Name, 3: Email, 4: Membership ID, 5: Membership Type, 6: Status
    const emailCol = columns[3]?.toLowerCase().trim()
    const statusCol = columns[6]?.toLowerCase().trim()

    if (!emailCol) {
      stats.invalidRows++
      continue
    }

    // Only process rows where the member is active
    if (statusCol !== 'active') {
      stats.totalProcessed++
      stats.noMatch++
      continue
    }

    stats.totalProcessed++

    // Derive username from the email's local part (e.g. ab1c23@soton.ac.uk → ab1c23)
    const csvUsername = emailCol.split('@')[0]

    // Try to find a user matching by email first, then by username
    const matchedUsers = (await payload.find({
      collection: 'users',
      where: {
        or: [{ email: { equals: emailCol } }, { username: { equals: csvUsername } }],
      },
      limit: 10,
    })) as UserFindResult

    if (matchedUsers.totalDocs === 0) {
      stats.noMatch++
      continue
    }

    stats.matchedRows++

    for (const user of matchedUsers.docs) {
      const currentRoles = user.roles || []

      if (currentRoles.includes(role)) {
        stats.alreadyHadRole++
        continue
      }

      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          roles: [...currentRoles, role],
        },
        overrideAccess: true,
      })

      stats.rolesAdded++
    }
  }

  return {
    stats,
  }
}

export const runCheckCsvAccountsFromFile = async ({
  payload,
  csvFilePath,
  role = 'susu',
}: {
  payload: PayloadLike
  csvFilePath: string
  role?: 'admin' | 'user' | 'susu'
}): Promise<CsvAccountCheckResult> => {
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`Could not find CSV file at ${csvFilePath}`)
  }

  const fileContent = fs.readFileSync(csvFilePath, 'utf-8')
  return checkCsvAccountsFromContent({ payload, csvContent: fileContent, role })
}

export const runCheckSingleUserFromCsvFile = async ({
  payload,
  csvFilePath,
  userDoc,
  role = 'susu',
}: {
  payload: PayloadLike
  csvFilePath: string
  userDoc: any
  role?: 'admin' | 'user' | 'susu'
}): Promise<void> => {
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`Could not find CSV file at ${csvFilePath}`)
  }

  const fileContent = fs.readFileSync(csvFilePath, 'utf-8')
  const lines = fileContent.split(/\r?\n/)

  const userEmail = typeof userDoc.email === 'string' ? userDoc.email.toLowerCase().trim() : ''
  const userUsername =
    typeof userDoc.username === 'string' ? userDoc.username.toLowerCase().trim() : ''

  if (!userEmail && !userUsername) return

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    if (!line.trim()) continue

    const columns = parseCsvRow(line)
    // 0: User ID, 1: First Name, 2: Last Name, 3: Email, 4: Membership ID, 5: Membership Type, 6: Status
    const emailCol = columns[3]?.toLowerCase().trim()
    const statusCol = columns[6]?.toLowerCase().trim()

    // If there is no email in the CSV, fallback to username matching via soton domain
    const csvUsername = emailCol ? emailCol.split('@')[0] : ''

    const isMatch =
      (emailCol && emailCol === userEmail) || (csvUsername && csvUsername === userUsername)
    const isActive = statusCol === 'active'

    if (isMatch && isActive) {
      const currentRoles = userDoc.roles || []
      if (!currentRoles.includes(role)) {
        await payload.update({
          collection: 'users',
          id: userDoc.id,
          data: {
            roles: [...currentRoles, role],
          },
          overrideAccess: true,
        })
        payload.logger.info(`Assigned role '${role}' to user ${userEmail || userUsername}`)
      }
      return
    }
  }
}

export const logCsvAccountCheckResult = (
  payload: Pick<PayloadLike, 'logger'>,
  result: CsvAccountCheckResult,
): void => {
  payload.logger.info('\n--- Finished checking CSV against users ---')
  payload.logger.info(`Rows processed: ${result.stats.totalProcessed}`)
  payload.logger.info(`Rows with at least one match: ${result.stats.matchedRows}`)
  payload.logger.info(`New 'susu' roles added: ${result.stats.rolesAdded}`)
  payload.logger.info(`Users who already had role: ${result.stats.alreadyHadRole}`)
  payload.logger.info(`No match found: ${result.stats.noMatch}`)
  payload.logger.info(`Invalid rows skipped: ${result.stats.invalidRows}`)
  payload.logger.info('------------------------------------------\n')
}
