import assert from 'node:assert/strict'
import { test } from 'node:test'

import { nominationDisplayName, nominationShortName } from './nominationLabel'

const ticket = {
  nickname: 'Vaughan',
  populatedNominees: [{ name: 'Vaughan Johnson (vdej1g25)' }],
}

test('the elected summary uses only the nickname when one exists', () => {
  assert.equal(nominationShortName(ticket), 'Vaughan')

  assert.equal(
    nominationShortName({
      nickname: '  ',
      populatedNominees: [{ name: 'No Nickname Person' }],
    }),
    'No Nickname Person',
  )

  assert.equal(
    nominationShortName({ populatedNominees: [{ name: 'No Nickname Person' }] }),
    'No Nickname Person',
  )
  assert.equal(nominationShortName(null), 'Re-Open Nominations')
  assert.equal(nominationShortName('missing-nomination-id'), 'Unknown')
})

test('the detailed result label keeps the nickname and full names', () => {
  assert.equal(nominationDisplayName(ticket), 'Vaughan - Vaughan Johnson (vdej1g25)')
})
