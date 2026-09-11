import type { PayloadHandler } from 'payload/config'

import { getDailyWord, getTodayDate } from '../../../app/(pages)/wordle/techWords'
import VALID_WORDS from '../../../app/(pages)/wordle/validWords.json'

type TileStatus = 'correct' | 'present' | 'absent'

function getRowStatuses(guess: string, solution: string): TileStatus[] {
  const statuses: TileStatus[] = Array(5).fill('absent')
  const solutionChars = solution.split('')
  const remaining: Record<string, number> = {}

  solutionChars.forEach(c => {
    remaining[c] = (remaining[c] || 0) + 1
  })

  for (let i = 0; i < 5; i++) {
    if (guess[i] === solution[i]) {
      statuses[i] = 'correct'
      remaining[guess[i]]--
    }
  }

  for (let i = 0; i < 5; i++) {
    if (statuses[i] !== 'correct') {
      const c = guess[i]
      if (remaining[c] > 0) {
        statuses[i] = 'present'
        remaining[c]--
      }
    }
  }

  return statuses
}

export const guess: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { date, guess: guessWord, isLastGuess } = req.body as {
    date?: string
    guess?: string
    isLastGuess?: boolean
  }

  if (!date || !guessWord) {
    res.status(400).json({ error: 'Missing date or guess' })
    return
  }

  const today = getTodayDate()
  if (date !== today) {
    res.status(400).json({ error: 'Invalid date' })
    return
  }

  const normalized = guessWord.toUpperCase()
  if (normalized.length !== 5 || !/^[A-Z]{5}$/.test(normalized)) {
    res.status(400).json({ error: 'Guess must be exactly 5 letters' })
    return
  }

  // Resolve daily word via Payload local API (bypasses public access restrictions)
  let dailyWord = getDailyWord()
  try {
    const overrideResult = await payload.find({
      collection: 'wordle-overrides',
      where: { date: { equals: date } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (overrideResult.docs.length > 0) {
      const word = (overrideResult.docs[0] as { word?: string }).word
      if (word) dailyWord = word.toUpperCase()
    }
  } catch {
    // fall back to default word
  }

  // Check if user has already saved a score for today (guard against replaying)
  try {
    const existing = await payload.find({
      collection: 'wordle-scores',
      where: {
        and: [{ user: { equals: user.id } }, { date: { equals: date } }],
      },
      limit: 1,
      depth: 0,
    })
    if (existing.totalDocs > 0) {
      res.status(409).json({ error: 'Already played today' })
      return
    }
  } catch {
    // proceed
  }

  // Validate word: must be in the allowed guess list or be the answer itself
  if (!VALID_WORDS.includes(normalized.toLowerCase()) && normalized !== dailyWord) {
    res.json({ valid: false, error: 'Not in word list' })
    return
  }

  const statuses = getRowStatuses(normalized, dailyWord)
  const won = normalized === dailyWord

  const response: {
    valid: boolean
    statuses: TileStatus[]
    won: boolean
    answer?: string
  } = { valid: true, statuses, won }

  // Only reveal the answer after a confirmed final failed guess
  if (isLastGuess && !won) {
    response.answer = dailyWord
  }

  res.json(response)
}
