'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import VALID_WORDS from './validWords.json'

import classes from './index.module.scss'

const MAX_GUESSES = 6
const WORD_LENGTH = 5

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
]

const getRowStatuses = (guess: string, solution: string) => {
  const statuses = Array(WORD_LENGTH).fill(classes.absent)
  const solutionChars = solution.split('')
  const remainingSolutionChars: Record<string, number> = {}

  solutionChars.forEach(char => {
    remainingSolutionChars[char] = (remainingSolutionChars[char] || 0) + 1
  })

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === solution[i]) {
      statuses[i] = classes.correct
      remainingSolutionChars[guess[i]]--
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (statuses[i] !== classes.correct) {
      const char = guess[i]
      if (remainingSolutionChars[char] > 0) {
        statuses[i] = classes.present
        remainingSolutionChars[char]--
      }
    }
  }

  return statuses
}

const getEmojiRow = (guess: string, solution: string) => {
  const rowStatuses = getRowStatuses(guess, solution)
  return rowStatuses
    .map(s => {
      if (s === classes.correct) return '🟩'
      if (s === classes.present) return '🟨'
      return '⬛'
    })
    .join('')
}

interface WordleGameProps {
  user: { id: string; name?: string | null; username?: string | null }
  solution: string
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
  const [currentGuess, setCurrentGuess] = useState('')
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [shakeRow, setShakeRow] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
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
    if (todayScore) {
      const attemptStrings = todayScore.attempts?.map((a: any) => a.guess) || []
      setGuesses(attemptStrings)
      setGameStatus(todayScore.solved ? 'won' : 'lost')
      setReplayLocked(true)
      fetchStats()
    } else if (!existingDisplayName) {
      setShowNameModal(true)
    }
  }, [todayScore, existingDisplayName, fetchStats])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 2500)
  }

  const handleCopyResult = async () => {
    const guessCount = gameStatus === 'won' ? guesses.length : 'X'
    let text = `ECSSle ${puzzleNumber} ${guessCount}/${MAX_GUESSES}\n\n`

    guesses.forEach(guess => {
      text += getEmojiRow(guess, solution) + '\n'
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
    (key: string) => {
      if (replayLocked) return
      if (gameStatus !== 'playing') return

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

        if (!VALID_WORDS.includes(currentGuess.toLowerCase()) && currentGuess !== solution) {
          showMessage('Not in word list')
          setShakeRow(true)
          setTimeout(() => setShakeRow(false), 500)
          return
        }

        const newGuesses = [...guesses, currentGuess]
        setGuesses(newGuesses)
        setCurrentGuess('')

        const solved = currentGuess === solution
        if (solved) {
          setGameStatus('won')
          saveScore(true, newGuesses.length, newGuesses)
        } else if (newGuesses.length >= MAX_GUESSES) {
          setGameStatus('lost')
          saveScore(false, MAX_GUESSES, newGuesses)
        }
        return
      }

      if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
        setCurrentGuess(prev => prev + key)
      }
    },
    [currentGuess, gameStatus, guesses, replayLocked, solution, saveScore],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [onKeyPress])

  useEffect(() => {
    if ((gameStatus === 'won' || gameStatus === 'lost') && announcementRef.current) {
      setTimeout(() => {
        announcementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [gameStatus])

  const getKeyStatus = (key: string) => {
    let bestStatus = ''

    guesses.forEach(guess => {
      const rowStatuses = getRowStatuses(guess, solution)

      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === key) {
          const status = rowStatuses[i]

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

  return (
    <div className={classes.wordleContainer}>
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

      <div className={classes.board}>
        {[...Array(MAX_GUESSES)].map((_, rowIndex) => {
          const isCurrentRow = rowIndex === guesses.length && !replayLocked
          const guess = guesses[rowIndex] || (isCurrentRow ? currentGuess : '')
          const rowClasses = [classes.row, isCurrentRow && shakeRow ? classes.shake : ''].join(' ')

          const isSubmitted = rowIndex < guesses.length
          const rowStatuses = isSubmitted ? getRowStatuses(guess, solution) : []

          return (
            <div key={rowIndex} className={rowClasses}>
              {[...Array(WORD_LENGTH)].map((_, colIndex) => {
                const letter = guess[colIndex] || ''
                const letterStatus = isSubmitted ? rowStatuses[colIndex] : ''

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
                  disabled={replayLocked || gameStatus !== 'playing'}
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
              The word was <strong>{solution}</strong> — try again tomorrow!
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
