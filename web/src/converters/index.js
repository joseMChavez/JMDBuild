// Picks the converter for a file. Each reader is a separate chunk loaded on first use, so the
// initial page only ships the interface.
import { ConversionError } from './errors.js'

export const ACCEPT = '.txt,.md,.markdown,.csv,.tsv,.xlsx,.xls,.pptx,.pdf,text/plain,text/markdown,text/csv,application/pdf'

const READERS = {
  text: { load: () => import('./text.js'), loadError: 'readError' },
  delimited: { load: () => import('./delimited.js'), loadError: 'readError' },
  workbook: { load: () => import('./workbook.js'), loadError: 'libExcel' },
  pptx: { load: () => import('./pptx.js'), loadError: 'libPpt' },
  pdf: { load: () => import('./pdf.js'), loadError: 'libPdf' },
}

const READER_BY_EXTENSION = {
  txt: 'text',
  md: 'text',
  markdown: 'text',
  csv: 'delimited',
  tsv: 'delimited',
  xlsx: 'workbook',
  xls: 'workbook',
  pptx: 'pptx',
  pdf: 'pdf',
}

const extensionOf = (name) => /\.([^.]+)$/.exec(name || '')?.[1].toLowerCase() ?? ''

export const isSupported = (name) => Object.hasOwn(READER_BY_EXTENSION, extensionOf(name))

// options: { t, ocr, pdfImages, ocrLanguage, onProgress(key, args) }
export async function convertFile(file, options) {
  if (!isSupported(file?.name)) throw new ConversionError('unsupported')
  const reader = READERS[READER_BY_EXTENSION[extensionOf(file.name)]]
  let module
  try {
    module = await reader.load()
  } catch {
    throw new ConversionError(reader.loadError)
  }
  try {
    return await module.convert(file, options)
  } catch (error) {
    if (error instanceof ConversionError) throw error
    console.error(error)
    throw new ConversionError('readError')
  }
}
