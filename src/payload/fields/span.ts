import type { Field } from 'payload/types'

// A shared column-span selector for newsletter blocks. Each block must pass a
// unique field name so the leaf types don't collide in the GraphQL layout union.
export const spanField = (name: string): Field => ({
  name,
  label: 'Column span',
  type: 'select',
  defaultValue: 'full',
  options: [
    { label: 'Full width', value: 'full' },
    { label: 'Two thirds', value: 'twoThirds' },
    { label: 'Half', value: 'half' },
    { label: 'One third', value: 'oneThird' },
  ],
})
