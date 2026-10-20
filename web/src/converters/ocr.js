// One Tesseract worker per document, started on the first page that needs it. tesseract.js loads
// its engine and language data from the jsDelivr CDN.
import { ConversionError } from './errors.js'

export function lazyOcr(language) {
  let worker = null
  return {
    async recognize(canvas) {
      if (!worker) {
        try {
          const { createWorker } = await import('tesseract.js')
          worker = await createWorker(language)
        } catch {
          throw new ConversionError('libOcr')
        }
      }
      const { data } = await worker.recognize(canvas)
      return data.text
    },
    async terminate() {
      await worker?.terminate()
    },
  }
}
