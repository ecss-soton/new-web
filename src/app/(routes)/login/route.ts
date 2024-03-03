import { cookies } from 'next/headers'

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const redirect = searchParams.get('redirect')
  if (redirect) {
    cookies().set('login-redirect', redirect, { maxAge: 60 * 5, path: '/', httpOnly: true })
  }

  return Response.redirect(`${process.env.NEXT_PUBLIC_SERVER_URL}/oauth2/authorize`)
}
