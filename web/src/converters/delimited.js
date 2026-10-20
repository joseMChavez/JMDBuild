// CSV and TSV files become a single Markdown table.
import { rowsToTable } from './markdown.js'
import { decodeText, normalizeNewlines } from './text.js'

const CANDIDATES = [',', ';', '\t', '|']

// Spanish and Italian Excel exports use ";" as the CSV separator, so it is detected from the header line.
export function detectDelimiter(text, fallback = ',') {
  const counts = new Map(CANDIDATES.map((candidate) => [candidate, 0]))
  let quoted = false
  for (const char of text.slice(0, 10000)) {
    if (char === '"') quoted = !quoted
    else if (!quoted && char === '\n') break
    else if (!quoted && counts.has(char)) counts.set(char, counts.get(char) + 1)
  }
  let best = fallback
  let max = 0
  for (const [candidate, count] of counts) {
    if (count > max || (count === max && count > 0 && candidate === fallback)) {
      best = candidate
      max = count
    }
  }
  return best
}

// RFC 4180: quoted fields may contain delimiters, newlines and doubled quotes.
export function parseDelimited(text, delimiter) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char !== '"') field += char
      else if (text[i + 1] === '"') {
        field += '"'
        i++
      } else quoted = false
    } else if (char === '"' && field === '') quoted = true
    else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field || row.length) rows.push([...row, field])
  return rows
}

export async function convert(file) {
  const text = normalizeNewlines(decodeText(await file.arrayBuffer()))
  const delimiter = detectDelimiter(text, /\.tsv$/i.test(file.name) ? '\t' : ',')
  return { markdown: rowsToTable(parseDelimited(text, delimiter)), assets: [] }
}
