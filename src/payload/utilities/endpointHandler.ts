import type { PayloadHandler } from 'payload/config'

export const withEndpointErrorHandler = (handler: PayloadHandler): PayloadHandler => {
  return async (req, res, next) => {
    try {
      return await handler(req, res, next)
    } catch (e: unknown) {
      req.payload.logger.error(e)
      return res.status(500).json({ error: 'Internal Server Error' })
    }
  }
}
