import type { MetadataRoute } from 'next'

import type { Newsletter, Page, Post, Project, Society, Sponsor } from '../payload/payload-types'
import { fetchDocs } from './_api/fetchDoc'

const BASE_URL = (process.env.NEXT_PUBLIC_SERVER_URL || 'https://society.ecs.soton.ac.uk').replace(
  /\/$/,
  '',
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts, projects, societies, sponsors, newsletters] = await Promise.all([
    fetchDocs<Page>('pages').catch(() => [] as Page[]),
    fetchDocs<Post>('posts').catch(() => [] as Post[]),
    fetchDocs<Project>('projects').catch(() => [] as Project[]),
    fetchDocs<Society>('societies').catch(() => [] as Society[]),
    fetchDocs<Sponsor>('sponsors').catch(() => [] as Sponsor[]),
    fetchDocs<Newsletter>('newsletters').catch(() => [] as Newsletter[]),
  ])

  const entries: MetadataRoute.Sitemap = []
  const seen = new Set<string>()

  const add = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  ): void => {
    const url = `${BASE_URL}${path}`
    if (seen.has(url)) return
    seen.add(url)
    entries.push({ url, priority, changeFrequency })
  }

  add('/', 1, 'weekly')
  add('/news', 0.8, 'monthly')
  add('/jumpstart', 0.7, 'weekly')

  pages.forEach(page => {
    if (page.slug && page.slug !== 'home') add(`/${page.slug}`, 0.7, 'monthly')
  })

  posts.forEach(post => {
    if (post.slug) add(`/posts/${post.slug}`, 0.6, 'monthly')
  })

  projects.forEach(project => {
    if (project.slug) add(`/projects/${project.slug}`, 0.6, 'monthly')
  })

  societies.forEach(society => {
    if (society.slug) add(`/societies/${society.slug}`, 0.5, 'monthly')
  })

  sponsors.forEach(sponsor => {
    if (sponsor.slug) add(`/sponsors/${sponsor.slug}`, 0.5, 'monthly')
  })

  newsletters.forEach(newsletter => {
    if (newsletter.slug) add(`/news/${newsletter.slug}`, 0.6, 'monthly')
  })

  return entries
}
