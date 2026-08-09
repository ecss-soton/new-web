import { cookies } from 'next/headers'

const getInternalRedirect = (redirect: string | undefined, baseUrl: string): string | null => {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) return null

  try {
    const redirectUrl = new URL(redirect, baseUrl)
    return redirectUrl.origin === new URL(baseUrl).origin ? redirectUrl.toString() : null
  } catch {
    return null
  }
}

export async function GET(): Promise<Response> {
  const redirect = cookies().get('login-redirect')

  let redirectUrl = process.env.NEXT_PUBLIC_SERVER_URL

  if (redirect) {
    const internalRedirect = getInternalRedirect(redirect.value, redirectUrl)
    if (internalRedirect) {
      redirectUrl = internalRedirect
    }
    cookies().delete('login-redirect')
  }

  return Response.redirect(redirectUrl)
}
