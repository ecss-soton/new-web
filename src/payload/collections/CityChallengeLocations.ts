import type { CollectionConfig, Validate } from 'payload/types'

import { admins } from '../access/admins'
import { user } from '../access/user'
import type { CityChallengeLocation } from '../payload-types'

const validateCoordinate =
  (minimum: number, maximum: number, label: string): Validate =>
  value => {
    if (value === undefined || value === null) return true
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < minimum ||
      value > maximum
    ) {
      return `${label} must be between ${minimum} and ${maximum}`
    }
    return true
  }

const validateCoordinatesOrLink: Validate = (value, { data, operation }) => {
  const doc = (data ?? {}) as Partial<CityChallengeLocation>
  const hasLat = typeof doc.latitude === 'number'
  const hasLng = typeof doc.longitude === 'number'
  const hasLink = typeof value === 'string' && value.trim() !== ''

  if (hasLat && hasLng) return true

  if (hasLat !== hasLng) {
    return 'Latitude and longitude must both be provided for location-based challenges.'
  }

  if (hasLink) return true

  if (operation === 'update' && !('latitude' in doc) && !('longitude' in doc)) {
    return true
  }

  return 'Provide either coordinates (latitude and longitude) or an external link.'
}

const validateLink: Validate = (value, options) => {
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
  return validateCoordinatesOrLink(value, options)
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
    defaultColumns: ['name', 'zone', 'latitude', 'longitude', 'link', 'sortOrder'],
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
      name: 'latitude',
      type: 'number',
      label: 'Latitude',
      validate: validateCoordinate(-90, 90, 'Latitude'),
      admin: {
        step: 0.0001,
        description: 'Required for location-based challenges.',
      },
    },
    {
      name: 'longitude',
      type: 'number',
      label: 'Longitude',
      validate: validateCoordinate(-180, 180, 'Longitude'),
      admin: {
        step: 0.0001,
        description: 'Required for location-based challenges.',
      },
    },
    {
      name: 'link',
      type: 'text',
      label: 'External Link',
      validate: validateLink,
      admin: {
        description:
          'For non-location challenges (e.g. "Follow this YouTube channel"). Must be an HTTPS URL.',
      },
    },
    {
      name: 'discoveryRadius',
      type: 'number',
      label: 'Discovery Radius (metres)',
      defaultValue: 50,
      admin: {
        description: 'How close (in metres) the user must be to discover this location.',
        step: 1,
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
