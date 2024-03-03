import { cookies } from 'next/headers'

export async function GET(): Promise<Response> {
  const redirect = cookies().get('login-redirect')

  let redirectUrl = process.env.NEXT_PUBLIC_SERVER_URL

  if (redirect) {
    redirectUrl = new URL(redirect.value, process.env.NEXT_PUBLIC_SERVER_URL).toString()
    cookies().delete('login-redirect')
  }

  return Response.redirect(redirectUrl)
}
