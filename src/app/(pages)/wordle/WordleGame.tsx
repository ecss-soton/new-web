'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import { inter } from '../../_utilities/font'
import VALID_WORDS from './validWords.json'

import classes from './index.module.scss'

const MAX_GUESSES = 6
const WORD_LENGTH = 5

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
]

type TileStatus = 'correct' | 'present' | 'absent'

// Compute tile statuses locally — only used for board replay when `solution` is known
// (i.e., when the game is already complete and page.tsx has safely passed the answer).
const getRowStatuses = (guess: string, solution: string): TileStatus[] => {
  const statuses: TileStatus[] = Array(WORD_LENGTH).fill('absent')
  const solutionChars = solution.split('')
  const remainingSolutionChars: Record<string, number> = {}

  solutionChars.forEach(char => {
    remainingSolutionChars[char] = (remainingSolutionChars[char] || 0) + 1
  })

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === solution[i]) {
      statuses[i] = 'correct'
      remainingSolutionChars[guess[i]]--
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (statuses[i] !== 'correct') {
      const char = guess[i]
      if (remainingSolutionChars[char] > 0) {
        statuses[i] = 'present'
        remainingSolutionChars[char]--
      }
    }
  }

  return statuses
}

// Map a status string ('correct'|'present'|'absent') to the corresponding CSS module class
const statusToClass = (status: TileStatus | string): string => {
  if (status === 'correct') return classes.correct
  if (status === 'present') return classes.present
  if (status === 'absent') return classes.absent
  // Fallback: the status might already be a class string (from `getRowStatuses` above)
  return status
}

const getEmojiFromStatus = (status: TileStatus | string): string => {
  if (status === 'correct' || status === classes.correct) return '🟩'
  if (status === 'present' || status === classes.present) return '🟨'
  return '⬛'
}

interface WordleGameProps {
  user: { id: string; name?: string | null; username?: string | null }
  /** Passed only when the game is already complete (loaded from saved score). null during active play. */
  solution: string | null
  todayDate: string
  puzzleNumber: number
  todayScore: any | null
  existingDisplayName: string | null
}

export const WordleGame: React.FC<WordleGameProps> = ({
  user,
  solution,
  todayDate,
  puzzleNumber,
  todayScore,
  existingDisplayName,
}) => {
  const [guesses, setGuesses] = useState<string[]>([])
  // Statuses for each submitted guess row, populated from the /guess endpoint or from solution.
  const [guessStatuses, setGuessStatuses] = useState<(TileStatus | string)[][]>([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [shakeRow, setShakeRow] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [isProcessingGuess, setIsProcessingGuess] = useState(false)
  // Revealed by the server on the final failed guess; also set from `solution` for completed games.
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null)
  const announcementRef = useRef<HTMLDivElement>(null)

  const [displayName, setDisplayName] = useState(existingDisplayName || '')
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState(user.name || user.username || '')
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [replayLocked, setReplayLocked] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editNameInput, setEditNameInput] = useState('')

  const fetchStats = useCallback(async () => {
    try {
      const req = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-scores/stats/${user.id}`,
        { credentials: 'include' },
      )
      const data = await req.json()
      if (req.ok) {
        setStats(data)
        if (data.displayName) {
          setDisplayName(data.displayName)
        }
      }
    } catch {
      // ignore
    }
  }, [user.id])

  const saveScore = useCallback(
    async (solved: boolean, guessCount: number, attemptList: string[]) => {
      setSaving(true)
      try {
        const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-scores/save`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: todayDate,
            solved,
            guesses: solved ? guessCount : MAX_GUESSES,
            attempts: attemptList.map(g => ({ guess: g })),
            displayName,
          }),
        })
        if (req.ok) {
          await fetchStats()
        } else if (req.status === 409) {
          setMessage('Already played today')
          setTimeout(() => setMessage(''), 2500)
        }
      } catch {
        setMessage('Failed to save score')
        setTimeout(() => setMessage(''), 2500)
      }
      setSaving(false)
    },
    [todayDate, displayName, fetchStats],
  )

  useEffect(() => {
    const checkToday = async () => {
      try {
        const req = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-scores?where[user][equals]=${user.id}&where[date][equals]=${todayDate}&depth=0`,
          { credentials: 'include' },
        )
        const { docs } = await req.json()
        if (docs && docs.length > 0) {
          const score = docs[0]
          const attemptList: string[] = score.attempts?.map((a: any) => a.guess) || []
          setGuesses(attemptList)
          setGameStatus(score.solved ? 'won' : 'lost')
          setReplayLocked(true)
          setDisplayName(score.displayName || existingDisplayName || '')
          // Rebuild board statuses from the saved solution (only available on completed games)
          if (solution) {
            setGuessStatuses(attemptList.map(g => getRowStatuses(g, solution)))
            if (!score.solved) setRevealedAnswer(solution)
          }
          fetchStats()
          return
        }
      } catch {
        // ignore, fall back to props
      }

      if (todayScore) {
        const attemptStrings = todayScore.attempts?.map((a: any) => a.guess) || []
        setGuesses(attemptStrings)
        setGameStatus(todayScore.solved ? 'won' : 'lost')
        setReplayLocked(true)
        if (solution) {
          setGuessStatuses(attemptStrings.map((g: string) => getRowStatuses(g, solution)))
          if (!todayScore.solved) setRevealedAnswer(solution)
        }
        fetchStats()
      } else if (!existingDisplayName) {
        setShowNameModal(true)
      }
    }

    checkToday()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 2500)
  }

  const handleCopyResult = async () => {
    const guessCount = gameStatus === 'won' ? guesses.length : 'X'
    let text = `ECSSle ${puzzleNumber} ${guessCount}/${MAX_GUESSES}\n\n`

    guesses.forEach((_, idx) => {
      const statuses = guessStatuses[idx] || []
      text += statuses.map(getEmojiFromStatus).join('') + '\n'
    })

    text += '\nhttps://ecss.club/wordle'

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showMessage('Failed to copy')
    }
  }

  const handleNameConfirm = () => {
    const trimmed = nameInput.trim()
    if (trimmed) {
      setDisplayName(trimmed)
    } else {
      const fallback = user.name || user.username || 'Anonymous'
      setDisplayName(fallback)
    }
    setShowNameModal(false)
  }

  const handleUpdateDisplayName = async () => {
    const trimmed = editNameInput.trim()
    if (!trimmed) {
      setEditingName(false)
      return
    }
    try {
      const req = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-scores/update-display-name`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: trimmed }),
        },
      )
      const data = await req.json()
      if (req.ok) {
        setDisplayName(data.displayName)
      }
    } catch {
      // ignore
    }
    setEditingName(false)
  }

  const startEditName = () => {
    setEditNameInput(displayName)
    setEditingName(true)
  }

  const onKeyPress = useCallback(
    async (key: string) => {
      if (replayLocked) return
      if (gameStatus !== 'playing') return
      if (isProcessingGuess) return

      if (key === 'BACKSPACE') {
        setCurrentGuess(prev => prev.slice(0, -1))
        return
      }

      if (key === 'ENTER') {
        if (currentGuess.length !== WORD_LENGTH) {
          showMessage('Not enough letters')
          setShakeRow(true)
          setTimeout(() => setShakeRow(false), 500)
          return
        }

        if (!VALID_WORDS.includes(currentGuess.toLowerCase())) {
          // Client-side fast-path for clear invalid guesses.
          // The server also validates, so a word that's the actual answer
          // but absent from the local list will still be accepted server-side.
          showMessage('Not in word list')
          setShakeRow(true)
          setTimeout(() => setShakeRow(false), 500)
          return
        }

        const newGuesses = [...guesses, currentGuess]
        const isLastGuess = newGuesses.length >= MAX_GUESSES

        setIsProcessingGuess(true)
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-scores/guess`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: todayDate, guess: currentGuess, isLastGuess }),
          })

          const data = await res.json()

          if (!res.ok) {
            showMessage(data.error || 'Server error')
            setShakeRow(true)
            setTimeout(() => setShakeRow(false), 500)
            return
          }

          if (!data.valid) {
            showMessage(data.error || 'Not in word list')
            setShakeRow(true)
            setTimeout(() => setShakeRow(false), 500)
            return
          }

          setGuesses(newGuesses)
          setGuessStatuses(prev => [...prev, data.statuses])
          setCurrentGuess('')

          if (data.won) {
            setGameStatus('won')
            saveScore(true, newGuesses.length, newGuesses)
          } else if (isLastGuess) {
            setGameStatus('lost')
            if (data.answer) setRevealedAnswer(data.answer)
            saveScore(false, MAX_GUESSES, newGuesses)
          }
        } catch {
          showMessage('Network error — try again')
          setShakeRow(true)
          setTimeout(() => setShakeRow(false), 500)
        } finally {
          setIsProcessingGuess(false)
        }
        return
      }

      if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
        setCurrentGuess(prev => prev + key)
      }
    },
    [currentGuess, gameStatus, guesses, replayLocked, isProcessingGuess, todayDate, saveScore],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNameModal) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const key = e.key.toUpperCase()
      if (key === 'ENTER' || key === 'BACKSPACE') {
        onKeyPress(key)
      } else if (/^[A-Z]$/.test(key)) {
        onKeyPress(key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onKeyPress, showNameModal])

  useEffect(() => {
    if ((gameStatus === 'won' || gameStatus === 'lost') && announcementRef.current) {
      setTimeout(() => {
        announcementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [gameStatus])

  const getKeyStatus = (key: string): string => {
    let bestStatus = ''

    guesses.forEach((guess, guessIdx) => {
      const rowStatuses = guessStatuses[guessIdx] || []

      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === key) {
          const rawStatus = rowStatuses[i]
          const status = statusToClass(rawStatus)

          if (status === classes.correct) {
            bestStatus = classes.correct
          } else if (status === classes.present && bestStatus !== classes.correct) {
            bestStatus = classes.present
          } else if (status === classes.absent && bestStatus === '') {
            bestStatus = classes.absent
          }
        }
      }
    })

    return bestStatus
  }

  const displayAnswer = revealedAnswer

  return (
    <div className={[classes.wordleContainer, inter.className].join(' ')}>
      {showNameModal && (
        <div className={classes.nameModalOverlay}>
          <div className={classes.nameModal}>
            <h2 className={classes.nameModalTitle}>Choose your display name</h2>
            <p className={classes.nameModalDesc}>This name will appear on the leaderboard.</p>
            <input
              className={classes.nameModalInput}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Enter display name"
              maxLength={24}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleNameConfirm()}
            />
            <button className={classes.nameModalButton} onClick={handleNameConfirm}>
              Start Playing
            </button>
          </div>
        </div>
      )}

      {message && <div className={classes.toast}>{message}</div>}
      {isProcessingGuess && <div className={classes.toast}>Checking…</div>}

      <div className={classes.board}>
        {[...Array(MAX_GUESSES)].map((_, rowIndex) => {
          const isCurrentRow = rowIndex === guesses.length && !replayLocked
          const guess = guesses[rowIndex] || (isCurrentRow ? currentGuess : '')
          const rowClasses = [classes.row, isCurrentRow && shakeRow ? classes.shake : ''].join(' ')

          const isSubmitted = rowIndex < guesses.length
          const rowStatuses = isSubmitted ? guessStatuses[rowIndex] || [] : []

          return (
            <div key={rowIndex} className={rowClasses}>
              {[...Array(WORD_LENGTH)].map((_, colIndex) => {
                const letter = guess[colIndex] || ''
                const rawStatus = isSubmitted ? rowStatuses[colIndex] : ''
                const letterStatus = rawStatus ? statusToClass(rawStatus) : ''

                return (
                  <div
                    key={colIndex}
                    className={`${classes.tile} ${letterStatus} ${
                      letter && !isSubmitted ? classes.populated : ''
                    }`}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className={classes.keyboard}>
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i} className={classes.keyboardRow}>
            {row.map(key => {
              const keyStatus = getKeyStatus(key)
              return (
                <button
                  key={key}
                  onClick={() => onKeyPress(key)}
                  disabled={replayLocked || gameStatus !== 'playing' || isProcessingGuess}
                  className={`${classes.key} ${keyStatus} ${key.length > 1 ? classes.keyWide : ''}`}
                >
                  {key === 'BACKSPACE' ? '←' : key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {(gameStatus === 'won' || gameStatus === 'lost') && (
        <div ref={announcementRef} className={classes.announcement}>
          {gameStatus === 'won' && (
            <p className={classes.winText}>You got it in {guesses.length}!</p>
          )}
          {gameStatus === 'lost' && (
            <p className={classes.tryAgainText}>
              {displayAnswer ? (
                <>
                  The word was <strong>{displayAnswer}</strong> — try again tomorrow!
                </>
              ) : (
                <>Better luck tomorrow!</>
              )}
            </p>
          )}
          <div className={classes.announcementActions}>
            <button className={classes.shareButton} onClick={handleCopyResult}>
              {copied ? 'Copied!' : 'Copy Result'}
            </button>
            <Link href="/wordle/leaderboard" className={classes.viewLeaderboardLink}>
              Leaderboard
            </Link>
          </div>
        </div>
      )}

      {saving && <p className={classes.savingText}>Saving your score...</p>}

      {stats && (
        <div className={classes.statsPanel}>
          <div className={classes.statsTitleRow}>
            <h3 className={classes.statsTitle}>
              {displayName ? `${displayName}'s Stats` : 'Your Stats'}
            </h3>
            {editingName ? (
              <div className={classes.editNameInline}>
                <input
                  className={classes.editNameInput}
                  type="text"
                  value={editNameInput}
                  onChange={e => setEditNameInput(e.target.value)}
                  maxLength={24}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleUpdateDisplayName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                />
                <button className={classes.editNameSave} onClick={handleUpdateDisplayName}>
                  Save
                </button>
                <button className={classes.editNameCancel} onClick={() => setEditingName(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className={classes.editNameButton}
                onClick={startEditName}
                title="Change display name"
              >
                Edit
              </button>
            )}
          </div>
          <div className={classes.statsGrid}>
            <div className={classes.statItem}>
              <span className={classes.statValue}>{stats.totalGames}</span>
              <span className={classes.statLabel}>Played</span>
            </div>
            <div className={classes.statItem}>
              <span className={classes.statValue}>{stats.winRate}%</span>
              <span className={classes.statLabel}>Win Rate</span>
            </div>
            <div className={classes.statItem}>
              <span className={classes.statValue}>{stats.currentStreak}</span>
              <span className={classes.statLabel}>Streak</span>
            </div>
            <div className={classes.statItem}>
              <span className={classes.statValue}>{stats.maxStreak}</span>
              <span className={classes.statLabel}>Max Streak</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
