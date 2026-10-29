import Archiver from 'archiver'
import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'

export const electionTranscript: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  const electionResult = await payload.findByID({
    collection: 'electionResults',
    id: req.params.id,
    depth: 0,
    overrideAccess: true,
    user,
  })

  if (!electionResult) {
    res.status(404).json({ error: 'Unknown election result' })
    return
  }

  // The transcript contains the raw ballot file, so it is only public when the
  // admin has enabled detailed results and the result is published.
  if (!isAdmin(user)) {
    const publiclyVisible =
      Boolean(electionResult.showOnMainPage) &&
      (!electionResult._status || electionResult._status === 'published')

    if (!publiclyVisible) {
      res.status(403).json({ error: 'This transcript is not public for this result.' })
      return
    }
  }

  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-disposition': 'attachment; filename=electionTranscript.zip',
  })

  const zip = Archiver('zip')

  zip.pipe(res)

  await zip
    .append(electionResult.roundTranscript, { name: 'RoundTranscript.txt' })
    .append(electionResult.ballot, { name: 'Ballot.blt' })
    .finalize()
}
