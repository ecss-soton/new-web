import dotenv from 'dotenv'
import next from 'next'
import build from 'next/dist/build'
import path from 'path'

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
})

import express from 'express'
// import { rateLimit } from 'express-rate-limit'
import payload from 'payload'

import { seed } from './payload/seed'
import { getRedirectRules, matchRedirectRule } from './payload/utilities/redirects'
import restartJobs from './payload/utilities/restartJobs'

const app = express()

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 200, // Limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.',
//   headers: true, // Include rate limit headers in the response
// })

// app.use(limiter)

const PORT = process.env.PORT || 3000

const start = async (): Promise<void> => {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || '',
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`)
      await restartJobs(payload)
    },
  })

  if (process.env.PAYLOAD_SEED === 'true') {
    await seed(payload)
    process.exit()
  }

  if (process.env.NEXT_BUILD) {
    app.listen(PORT, async () => {
      payload.logger.info(`Next.js is now building...`)
      // @ts-expect-error
      await build(path.join(__dirname, '../'))
      process.exit()
    })

    return
  }

  const nextApp = next({
    dev: process.env.NODE_ENV !== 'production',
  })

  const nextHandler = nextApp.getRequestHandler()

  app.use(async (req, res, nextMiddleware) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return nextMiddleware()
    }

    if (
      req.path.startsWith('/_next') ||
      req.path.startsWith('/api') ||
      req.path === '/favicon.ico' ||
      req.path === '/robots.txt' ||
      req.path === '/sitemap.xml'
    ) {
      return nextMiddleware()
    }

    try {
      const requestUrl = new URL(req.originalUrl || req.url, 'http://localhost:3000')
      const redirectRules = await getRedirectRules(payload)
      const matched = matchRedirectRule(redirectRules, requestUrl.pathname)

      if (!matched) {
        return nextMiddleware()
      }

      return res.redirect(matched.permanent ? 301 : 302, matched.destination)
    } catch (error: unknown) {
      // Explicitly checking if it's an Error object to access .message safely
      const message = error instanceof Error ? error.message : 'Unknown error'
      payload.logger.error(`Error resolving redirects: ${message}`)
      return nextMiddleware()
    }
  })

  app.use((req, res) => nextHandler(req, res))

  nextApp.prepare().then(() => {
    payload.logger.info('Starting Next.js...')

    app.listen(PORT, async () => {
      payload.logger.info(`Next.js App URL: ${process.env.PAYLOAD_PUBLIC_SERVER_URL}`)
    })
  })
}

start()
