import type { BeforeValidateHook } from 'payload/dist/collections/config/types'

/**
 * The collection deliberately has no `mimeTypes` allow-list: mobile browsers
 * frequently report a `.csv` as `text/plain` or `application/octet-stream`,
 * which made both the admin file picker and Payload's mime validator reject
 * otherwise valid exports. The file extension is the reliable check here, and
 * the contents are parsed (and reported) by the processing hook.
 */
export const validateCsvUpload: BeforeValidateHook = ({ data }) => {
  const filename = typeof data?.filename === 'string' ? data.filename : ''

  if (filename && !/\.csv$/i.test(filename)) {
    throw new Error(`Member imports must be a .csv file (received "${filename}").`)
  }

  return data
}
