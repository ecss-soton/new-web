import { cookies } from 'next/headers'

const isInternalRedirect = (redirect: string): boolean => {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL
  if (!baseUrl || !redirect.startsWith('/') || redirect.startsWith('//')) return false

  try {
    return new URL(redirect, baseUrl).origin === new URL(baseUrl).origin
  } catch {
    return false
  }
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const redirect = searchParams.get('redirect')
  if (redirect && isInternalRedirect(redirect)) {
    cookies().set('login-redirect', redirect, { maxAge: 60 * 5, path: '/', httpOnly: true })
  }

  return Response.redirect(`${process.env.NEXT_PUBLIC_SERVER_URL}/oauth2/authorize`)
}
