export const HACKATHON_TYPES = [
  { label: 'Internal (ECSS)', value: 'internal' },
  { label: 'External', value: 'external' },
  { label: 'Other Society', value: 'other-society' },
] as const

export type HackathonType = (typeof HACKATHON_TYPES)[number]['value']
