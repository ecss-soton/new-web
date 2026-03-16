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
    const firstName = columns[1]?.trim()
    const lastName = columns[2]?.trim()

    if (!firstName || !lastName) {
      stats.invalidRows++
      continue
    }

    stats.totalProcessed++

    const matchedUsers = (await payload.find({
      collection: 'users',
      where: {
        and: [{ name: { contains: firstName } }, { name: { contains: lastName } }],
      },
      limit: 100,
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
