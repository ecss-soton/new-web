import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import type { User } from '../../payload/payload-types'
import { payloadToken } from '../_api/token'

export const getMeUser = async (args?: {
  nullUserRedirect?: string
  validUserRedirect?: string
  /**
   * When `true`, a failed `/api/users/me` request resolves to `{ user: null }`
   * instead of throwing. Callers that render gracefully for anonymous visitors
   * can then avoid wrapping this call in a broad `try`/`catch`.
   */
  tolerateRequestErrors?: boolean
}): Promise<{
  user: User
  token: string
}> => {
  const { nullUserRedirect, validUserRedirect, tolerateRequestErrors } = args || {}

  // This dynamic read must stay outside of any try/catch. Next signals its
  // static/dynamic detection by throwing from here (DynamicServerError), and
  // swallowing that error leaves the route misclassified as static, which only
  // fails in a production build:
  // "Page changed from static to dynamic at runtime ... reason: cookies".
  const cookieStore = cookies()
  const token = cookieStore.get(payloadToken)?.value

  let requestSucceeded = false
  let user: User = null

  // Only the network request is guarded.
  try {
    const meUserReq = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/me`, {
      headers: {
        Authorization: `JWT ${token}`,
      },
    })

    requestSucceeded = meUserReq.ok
    ;({ user } = await meUserReq.json())
  } catch (error: unknown) {
    if (!tolerateRequestErrors) throw error

    requestSucceeded = false
    user = null
  }

  if (validUserRedirect && requestSucceeded && user) {
    redirect(validUserRedirect)
  }

  if (nullUserRedirect && (!requestSucceeded || !user)) {
    redirect(nullUserRedirect)
  }

  return {
    user,
    token,
  }
}
