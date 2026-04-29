import type { Payload } from 'payload'

import type { Table } from '../../../payload-types'

export const getTableByJoinCode = async (
  payload: Payload,
  joinCode: string,
): Promise<Table | null> => {
  const result = await payload.find({
    collection: 'tables',
    where: { joinCode: { equals: joinCode } },
    limit: 1,
    depth: 0,
  })
  return (result.docs[0] as Table) || null
}
