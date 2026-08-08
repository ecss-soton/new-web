import type { CollectionConfig, Validate } from 'payload/types'

import { admins } from '../access/admins'
import { user } from '../access/user'

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
    defaultColumns: ['name', 'latitude', 'longitude', 'sortOrder'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Location Name',
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
      name: 'latitude',
      type: 'number',
      required: true,
      label: 'Latitude',
      validate: validateCoordinate(-90, 90, 'Latitude'),
      admin: {
        step: 0.0001,
      },
    },
    {
      name: 'longitude',
      type: 'number',
      required: true,
      label: 'Longitude',
      validate: validateCoordinate(-180, 180, 'Longitude'),
      admin: {
        step: 0.0001,
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
