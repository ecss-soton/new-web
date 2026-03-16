import type { PayloadHandler } from 'payload/config'

import { checkRole } from '../../Users/checkRole'

export const isSusuMember: PayloadHandler = async (req, res): Promise<void> => {
  const { user } = req

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const isSusu = checkRole(['susu'], user) || false

  res.json({ isSusuMember: isSusu })
}
