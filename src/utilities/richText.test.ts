import assert from 'node:assert/strict'
import { test } from 'node:test'

import { richTextToPlainText } from './richText'

test('rich text strings pass through unchanged', () => {
  assert.equal(richTextToPlainText('  Hello world  '), 'Hello world')
})

test('rich text blocks become newline-separated plain text', () => {
  const content = [
    { type: 'h2', children: [{ text: 'Spring social' }] },
    {
      type: 'p',
      children: [
        { text: 'Join us in ' },
        { type: 'link', url: 'https://ecss.example.com', children: [{ text: 'Building 32' }] },
        { text: ' for pizza.' },
      ],
    },
    { type: 'p', children: [{ text: '' }] },
    { type: 'p', children: [{ text: 'Doors at 19:00.' }] },
  ]

  const text = richTextToPlainText(content)
  assert.equal(
    text,
    [
      'Spring social',
      'Join us in Building 32 (https://ecss.example.com) for pizza.',
      'Doors at 19:00.',
    ].join('\n'),
  )
})

test('rich text collapses whitespace inside a block', () => {
  const content = [{ type: 'p', children: [{ text: 'Line one\n\n  line two' }] }]
  assert.equal(richTextToPlainText(content), 'Line one line two')
})

test('unsupported rich text values become an empty string', () => {
  assert.equal(richTextToPlainText(null), '')
  assert.equal(richTextToPlainText(undefined), '')
  assert.equal(richTextToPlainText({ type: 'p' }), '')
  assert.equal(richTextToPlainText([null, 42, 'ignored']), '')
})
