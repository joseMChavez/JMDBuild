// XLSX and XLS: one "## Sheet" section with a table per worksheet, plus embedded images.
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { appendImageSection, rowsToTable } from './markdown.js'
import { extractMedia } from './ooxml.js'

export async function convert(file, { t }) {
  const data = new Uint8Array(await file.arrayBuffer())
  const workbook = XLSX.read(data, { type: 'array', cellDates: true, dense: true })
  const sections = workbook.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', raw: false, blankrows: false })
    return `## ${name}\n\n${rowsToTable(rows)}`.trimEnd()
  })
  const assets = /\.xlsx$/i.test(file.name) ? await extractMedia(await JSZip.loadAsync(data), 'xl/media/') : []
  return { markdown: appendImageSection(sections.join('\n\n'), assets, t('images')), assets }
}
