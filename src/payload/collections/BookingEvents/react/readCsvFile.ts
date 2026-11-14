const MAX_CSV_FILE_BYTES = 2 * 1024 * 1024
const CSV_EXTENSION = /\.(csv|tsv|txt)$/i

/**
 * Reads a picked CSV in the browser so the paste and upload paths share one
 * importer. The extension is checked rather than the MIME type because mobile
 * browsers frequently report a `.csv` as `text/plain` or `application/octet-stream`.
 */
export const readCsvFile = async (file: File): Promise<string> => {
  if (!CSV_EXTENSION.test(file.name)) {
    throw new Error(`Choose a .csv file (received "${file.name}")`)
  }

  if (file.size > MAX_CSV_FILE_BYTES) {
    throw new Error('That file is larger than 2 MB')
  }

  return file.text()
}
