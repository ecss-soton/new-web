import type { AfterChangeHook, AfterDeleteHook } from 'payload/dist/collections/config/types'

import { resetRedirectRules } from '../../../utilities/redirects'

export const invalidateRedirectsAfterChange: AfterChangeHook = ({ doc }) => {
  resetRedirectRules()

  return doc
}

export const invalidateRedirectsAfterDelete: AfterDeleteHook = ({ doc }) => {
  resetRedirectRules()

  return doc
}
