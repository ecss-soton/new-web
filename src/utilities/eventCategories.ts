export const EVENT_CATEGORIES = [
  { label: 'Welcome / General', value: 'welcome' },
  { label: 'Academic', value: 'academic' },
  { label: 'Social', value: 'social' },
  { label: 'Competitive / Track', value: 'competitive' },
] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]['value']

export const EVENT_CATEGORY_VALUES: EventCategory[] = EVENT_CATEGORIES.map(
  category => category.value,
)

export const isEventCategory = (value: unknown): value is EventCategory =>
  typeof value === 'string' && EVENT_CATEGORY_VALUES.includes(value as EventCategory)
