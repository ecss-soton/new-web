import type { CollectionConfig, Validate } from 'payload/types'

import { admins } from '../access/admins'
import { user } from '../access/user'
import Groups from './groups'

// Coordinates are optional, but latitude and longitude must be supplied together.
// Both validators perform the same pair check so it holds whichever field changes.
const validateCoordinate =
  (minimum: number, maximum: number, label: string): Validate =>
  (value, { data }) => {
    if (value !== undefined && value !== null) {
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < minimum ||
        value > maximum
      ) {
        return `${label} must be between ${minimum} and ${maximum}`
      }
    }

    const doc = (data ?? {}) as { latitude?: unknown; longitude?: unknown }
    const hasLat = typeof doc.latitude === 'number'
    const hasLng = typeof doc.longitude === 'number'
    if (hasLat !== hasLng) {
      return 'Latitude and longitude must both be provided (or left blank).'
    }

    return true
  }

const validatePoints: Validate = value => {
  if (value === undefined || value === null) return true
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return 'Points must be a whole number of 0 or more'
  }
  return true
}

const validateMaxCount: Validate = (value, { data }) => {
  if ((data as { completionType?: unknown } | undefined)?.completionType !== 'counter') {
    return true
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return 'Counter challenges require a maximum count of 1 or more'
  }
  return true
}

const validateLink: Validate = value => {
  if (typeof value === 'string' && value.trim() !== '') {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      return 'Link must be a valid URL'
    }
    if (url.protocol !== 'https:') {
      return 'Link must use HTTPS'
    }
  }
  return true
}

const CityChallengeLocations: CollectionConfig = {
  slug: 'city-challenge-locations',
  access: {
    read: user,
    create: admins,
    update: admins,
    delete: admins,
  },
  admin: {
    useAsTitle: 'name',
    group: Groups.CityChallenge,
    defaultColumns: [
      'name',
      'zone',
      'completionType',
      'points',
      'maxCount',
      'latitude',
      'longitude',
      'link',
      'sortOrder',
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Challenge Name',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description / Clue',
      admin: {
        description: 'A hint or description for the scavenger hunt.',
      },
    },
    {
      name: 'zone',
      type: 'text',
      label: 'Zone',
      admin: {
        description:
          'Optional label used to group challenges in the list view (e.g. "Common Zone", "City Zone"). Challenges without a zone appear under "No Zone".',
      },
    },
    {
      name: 'completionType',
      type: 'select',
      label: 'Completion Type',
      required: true,
      defaultValue: 'tick',
      options: [
        { label: 'Tick (done / not done)', value: 'tick' },
        { label: 'Counter (x out of y)', value: 'counter' },
      ],
      admin: {
        description:
          'A tick awards its points once. A counter awards points per increment up to the maximum.',
      },
    },
    {
      name: 'points',
      type: 'number',
      label: 'Points',
      defaultValue: 0,
      validate: validatePoints,
      admin: {
        step: 1,
        description: 'Points awarded for a completed tick, or per unit for a counter.',
      },
    },
    {
      name: 'maxCount',
      type: 'number',
      label: 'Maximum Count',
      validate: validateMaxCount,
      admin: {
        step: 1,
        condition: data => (data?.completionType as string | undefined) === 'counter',
        description: 'Required for counter challenges: the maximum number of increments.',
      },
    },
    {
      name: 'latitude',
      type: 'number',
      label: 'Latitude',
      validate: validateCoordinate(-90, 90, 'Latitude'),
      admin: {
        step: 0.0001,
        description: 'Optional. If provided, longitude must be provided too.',
      },
    },
    {
      name: 'longitude',
      type: 'number',
      label: 'Longitude',
      validate: validateCoordinate(-180, 180, 'Longitude'),
      admin: {
        step: 0.0001,
        description: 'Optional. If provided, latitude must be provided too.',
      },
    },
    {
      name: 'link',
      type: 'text',
      label: 'External Link',
      validate: validateLink,
      admin: {
        description:
          'Optional. For non-location challenges (e.g. "Follow this YouTube channel"). Must be an HTTPS URL.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sort Order',
      defaultValue: 0,
    },
  ],
}

export default CityChallengeLocations
