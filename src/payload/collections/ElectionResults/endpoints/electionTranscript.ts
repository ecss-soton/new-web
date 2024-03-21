import Archiver from 'archiver'
import type { PayloadHandler } from 'payload/config'

export const electionTranscript: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  const electionResult = await payload.findByID({
    collection: 'electionResults',
    id: req.params.id,
    depth: 0,
    user,
  })

  if (!electionResult) {
    res.status(404).json({ error: 'Unknown election result' })
    return
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
