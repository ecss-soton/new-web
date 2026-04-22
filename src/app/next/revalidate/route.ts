import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<Response> {
  const collection = request.nextUrl.searchParams.get('collection')
  const slug = request.nextUrl.searchParams.get('slug')
  // Plain tag revalidation — used for globals (header, footer, settings)
  const tag = request.nextUrl.searchParams.get('tag')
  const secret = request.nextUrl.searchParams.get('secret')

  if (!secret || secret !== process.env.NEXT_PRIVATE_REVALIDATION_KEY) {
    // Do not indicate that the revalidation key is incorrect in the response
    // This will protect this API route from being exploited
    return new Response('Invalid request', { status: 400 })
  }

  // Plain tag revalidation (globals: header, footer, settings)
  if (typeof tag === 'string') {
    revalidateTag(tag)
    return NextResponse.json({ revalidated: true, tag, now: Date.now() })
  }

  // Collection + slug revalidation (documents: pages, posts, projects, etc.)
  if (typeof collection === 'string' && typeof slug === 'string') {
    revalidateTag(`${collection}_${slug}`)
    return NextResponse.json({ revalidated: true, now: Date.now() })
  }

  return new Response('Invalid request', { status: 400 })
}
