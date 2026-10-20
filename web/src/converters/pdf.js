// PDF: text with paragraphs and headings, OCR for pages without a text layer, and pages that
// contain raster images kept as JPEG assets.
import { GlobalWorkerOptions, OPS, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ConversionError } from './errors.js'
import { lazyOcr } from './ocr.js'
import { bodyFontSize, extractLines, pageToMarkdown, plainTextToParagraphs } from './pdf-layout.js'

GlobalWorkerOptions.workerSrc = workerUrl

// Copied from pdfjs-dist by scripts/copy-pdfjs-assets.mjs and served from our own origin.
const DATA_URL = `${import.meta.env.BASE_URL}pdfjs/`
const IMAGE_WIDTH = 1200
const OCR_SCALE = 2
const OCR_MAX_WIDTH = 2400
// Icons, bullets and rules are smaller than this (in source pixels) and don't make a page "an image".
const MIN_IMAGE_AREA = 150 * 150

const IMAGE_SIZE = new Map([
  [OPS.paintImageXObject, (args) => [args[1], args[2]]],
  [OPS.paintInlineImageXObject, (args) => [args[0]?.width, args[0]?.height]],
  [OPS.paintImageMaskXObject, (args) => [args[0]?.width, args[0]?.height]],
])

async function hasSignificantImage(page) {
  const { fnArray, argsArray } = await page.getOperatorList()
  return fnArray.some((fn, i) => {
    const [width, height] = IMAGE_SIZE.get(fn)?.(argsArray[i]) ?? []
    return width * height >= MIN_IMAGE_AREA
  })
}

async function renderPage(page, scale) {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, viewport }).promise
  return canvas
}

async function toJpeg(canvas, maxWidth) {
  let target = canvas
  if (canvas.width > maxWidth) {
    target = document.createElement('canvas')
    target.width = maxWidth
    target.height = Math.round((canvas.height * maxWidth) / canvas.width)
    target.getContext('2d').drawImage(canvas, 0, 0, target.width, target.height)
  }
  const blob = await new Promise((resolve) => target.toBlob(resolve, 'image/jpeg', 0.82))
  if (target !== canvas) target.width = target.height = 0
  return blob
}

export async function convert(file, { t, ocr, pdfImages, ocrLanguage, onProgress }) {
  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${DATA_URL}cmaps/`,
    standardFontDataUrl: `${DATA_URL}standard_fonts/`,
    wasmUrl: `${DATA_URL}wasm/`,
    iccUrl: `${DATA_URL}iccs/`,
    enableXfa: false,
  })
  let pdf
  try {
    pdf = await loadingTask.promise
  } catch {
    await loadingTask.destroy()
    throw new ConversionError('readError')
  }
  const recognizer = ocr ? lazyOcr(ocrLanguage) : null
  const total = pdf.numPages
  const pages = []
  const assets = []
  try {
    for (let n = 1; n <= total; n++) {
      onProgress?.('progress', { n, total })
      const page = await pdf.getPage(n)
      const record = { n, lines: extractLines((await page.getTextContent()).items), ocrText: '', image: null }
      const needsOcr = Boolean(recognizer) && !record.lines.length
      const withImage = pdfImages && (await hasSignificantImage(page))
      if (needsOcr || withImage) {
        const width = page.getViewport({ scale: 1 }).width
        const canvas = await renderPage(page, needsOcr ? Math.min(OCR_SCALE, OCR_MAX_WIDTH / width) : Math.min(1.5, IMAGE_WIDTH / width))
        try {
          if (withImage) {
            const blob = await toJpeg(canvas, IMAGE_WIDTH)
            if (blob) {
              record.image = { path: `assets/images/pdf-page-${n}.jpg`, blob }
              assets.push(record.image)
            }
          }
          if (needsOcr) {
            onProgress?.('ocrProgress', { n, total })
            record.ocrText = plainTextToParagraphs(await recognizer.recognize(canvas))
          }
        } finally {
          canvas.width = canvas.height = 0
        }
      }
      pages.push(record)
      page.cleanup()
    }
  } finally {
    await recognizer?.terminate()
    await loadingTask.destroy()
  }

  const bodySize = bodyFontSize(pages.map((page) => page.lines))
  const markdown = pages
    .map(({ n, lines, ocrText, image }) => {
      const parts = []
      if (lines.length) parts.push(pageToMarkdown(lines, bodySize))
      if (ocrText) parts.push(ocrText)
      if (image) parts.push(`### ${t('pdfPage')} ${n}\n\n![${t('pdfPage')} ${n}](${image.path})`)
      return parts.join('\n\n')
    })
    .filter(Boolean)
    .join('\n\n')
  if (!markdown.trim()) throw new ConversionError('noPdfText')
  return { markdown, assets }
}
