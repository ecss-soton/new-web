import type { Payload } from 'payload'
import type { PayloadHandler } from 'payload/config'

import { getDailyWord, getTodayDate } from '../../../../app/(pages)/wordle/techWords'
import VALID_WORDS from '../../../../app/(pages)/wordle/validWords.json'

const MAX_GUESSES = 6
const WORD_LENGTH = 5

type TileStatus = 'correct' | 'present' | 'absent'

interface StoredAttempt {
  guess?: string | null
  statuses?: string | null
}

function getRowStatuses(guess: string, solution: string): TileStatus[] {
  const statuses: TileStatus[] = Array(WORD_LENGTH).fill('absent')
  const remaining: Record<string, number> = {}

  solution.split('').forEach(c => {
    remaining[c] = (remaining[c] || 0) + 1
  })

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === solution[i]) {
      statuses[i] = 'correct'
      remaining[guess[i]]--
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
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

const resolveDailyWord = async (payload: Payload, date: string): Promise<string> => {
  let dailyWord = getDailyWord()
  try {
    const overrideResult = await payload.find({
      collection: 'wordle-overrides',
      where: { date: { equals: date } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const word = (overrideResult.docs[0] as { word?: string } | undefined)?.word
    if (word) dailyWord = word.toUpperCase()
  } catch {
    // fall back to the computed word
  }
  return dailyWord
}

export const guess: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const {
    date,
    guess: guessWord,
    displayName,
  } = req.body as {
    date?: string
    guess?: string
    displayName?: string
  }

  if (!date || !guessWord) {
    res.status(400).json({ error: 'Missing date or guess' })
    return
  }

  if (date !== getTodayDate()) {
    res.status(400).json({ error: 'Invalid date' })
    return
  }

  const normalized = guessWord.toUpperCase()
  if (normalized.length !== WORD_LENGTH || !/^[A-Z]{5}$/.test(normalized)) {
    res.status(400).json({ error: 'Guess must be exactly 5 letters' })
    return
  }

  try {
    const existingResult = await payload.find({
      collection: 'wordle-scores',
      where: { and: [{ user: { equals: user.id } }, { date: { equals: date } }] },
      limit: 1,
      depth: 0,
    })
    const existing = existingResult.docs[0] as unknown as
      | {
          id: string
          completed?: boolean | null
          displayName?: string | null
          attempts?: StoredAttempt[] | null
        }
      | undefined

    if (existing?.completed) {
      res.status(409).json({ error: 'Already played today' })
      return
    }

    const dailyWord = await resolveDailyWord(payload, date)

    if (!VALID_WORDS.includes(normalized.toLowerCase()) && normalized !== dailyWord) {
      res.json({ valid: false, error: 'Not in word list' })
      return
    }

    const previousAttempts = existing?.attempts || []
    const attemptNumber = previousAttempts.length + 1
    const statuses = getRowStatuses(normalized, dailyWord)
    const won = normalized === dailyWord
    const completed = won || attemptNumber >= MAX_GUESSES

    const attempts = [
      ...previousAttempts.map(attempt => ({
        guess: attempt.guess || '',
        statuses: attempt.statuses || '',
      })),
      { guess: normalized, statuses: statuses.join(',') },
    ]

    const data = {
      user: user.id,
      date,
      displayName:
        existing?.displayName || displayName?.trim() || user.name || user.username || 'Anonymous',
      solved: won,
      completed,
      guesses: attemptNumber,
      attempts,
      answer: completed && !won ? dailyWord : null,
    }

    if (existing) {
      await payload.update({
        collection: 'wordle-scores',
        id: existing.id,
        data,
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'wordle-scores',
        data,
        overrideAccess: true,
      })
    }

    res.json({
      valid: true,
      statuses,
      won,
      completed,
      attempts: attemptNumber,
      ...(completed && !won ? { answer: dailyWord } : {}),
    })
  } catch (err: unknown) {
    // A concurrent first guess can hit the unique (user, date) index; treat it
    // as "already in progress" rather than failing.
    const message = err instanceof Error ? err.message : ''
    if (/duplicate key|E11000/i.test(message)) {
      res.status(409).json({ error: 'Guess already in progress, please retry' })
      return
    }
    payload.logger.error(message || 'Unknown error')
    res.status(500).json({ error: 'Failed to record guess' })
  }
}
