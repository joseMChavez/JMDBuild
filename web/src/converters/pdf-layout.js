// Rebuilds readable Markdown from pdf.js text items: lines come from baselines, paragraphs from
// vertical gaps and sentence ends, headings from font size relative to the body text, and bullet
// glyphs become list items.

const BULLET = /^[•●○◦▪▫■□‣⁃∙·◆◇➢➤►▶✓✔–—-]\s+/u
const NUMBERED = /^\(?\d{1,3}[.)]\s+/

// Groups text items into lines of { text, x, y, right, size }.
export function extractLines(items) {
  const lines = []
  let line = null
  const flush = () => {
    const text = line?.text.replace(/\s+/g, ' ').trim()
    if (text) lines.push({ ...line, text })
    line = null
  }
  for (const item of items) {
    if (typeof item.str !== 'string') continue
    if (!item.str) {
      if (item.hasEOL) flush()
      continue
    }
    const [, , , scaleY, x, y] = item.transform
    const size = item.height || Math.abs(scaleY) || 1
    if (line && Math.abs(y - line.y) > Math.max(line.size, size) * 0.6) flush()
    if (!line) line = { text: '', x, y, right: x, size }
    else if (x - line.right > size * 0.2 && !/\s$/.test(line.text) && !/^\s/.test(item.str)) line.text += ' '
    line.text += item.str
    line.size = Math.max(line.size, size)
    line.right = Math.max(line.right, x + (item.width || 0))
    if (item.hasEOL) flush()
  }
  flush()
  return lines
}

// The most common font size, weighted by characters, across all pages.
export function bodyFontSize(pages) {
  const weights = new Map()
  for (const line of pages.flat()) {
    const size = Math.round(line.size * 2) / 2
    weights.set(size, (weights.get(size) || 0) + line.text.length)
  }
  let body = 0
  let max = -1
  for (const [size, weight] of weights) {
    if (weight > max) {
      body = size
      max = weight
    }
  }
  return body
}

function headingLevel(line, bodySize) {
  if (!bodySize || line.text.length > 150) return 0
  const ratio = line.size / bodySize
  return ratio >= 1.9 ? 1 : ratio >= 1.45 ? 2 : ratio >= 1.18 ? 3 : 0
}

export function joinLine(text, next) {
  return /\p{Ll}-$/u.test(text) && /^\p{Ll}/u.test(next) ? text.slice(0, -1) + next : `${text} ${next}`
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function linesToBlocks(lines, bodySize) {
  const maxRight = Math.max(...lines.map((line) => line.right))
  const gaps = lines.slice(1).map((line, i) => lines[i].y - line.y)
  const lineGap = median(gaps.filter((gap, i) => gap > 0 && gap < lines[i + 1].size * 3))
  const blocks = []
  let current = null
  lines.forEach((line, i) => {
    const prev = lines[i - 1]
    const heading = headingLevel(line, bodySize)
    const bullet = BULLET.exec(line.text)
    let startsBlock = !current
    if (!startsBlock) {
      const gap = prev.y - line.y
      startsBlock =
        heading !== current.heading ||
        Boolean(bullet) ||
        NUMBERED.test(line.text) ||
        gap < line.size * 0.3 ||
        gap > (lineGap ? lineGap * 1.35 : line.size * 1.6) ||
        Math.abs(line.size - prev.size) > (bodySize || line.size) * 0.15 ||
        line.x - prev.x > line.size ||
        prev.right < maxRight * 0.7 ||
        (/[.!?:;]$/.test(prev.text) && prev.right < maxRight * 0.85)
    }
    if (startsBlock) {
      current = bullet
        ? { type: 'li', heading, text: line.text.slice(bullet[0].length) }
        : { type: heading ? 'h' : 'p', heading, text: line.text }
      blocks.push(current)
    } else current.text = joinLine(current.text, line.text)
  })
  return blocks
}

export function blocksToMarkdown(blocks) {
  return blocks
    .map((block, i) => {
      const separator = i === 0 ? '' : block.type === 'li' && blocks[i - 1].type === 'li' ? '\n' : '\n\n'
      const text = block.type === 'li' ? `- ${block.text}` : block.type === 'h' ? `${'#'.repeat(block.heading)} ${block.text}` : block.text
      return separator + text
    })
    .join('')
}

export const pageToMarkdown = (lines, bodySize) => blocksToMarkdown(linesToBlocks(lines, bodySize))

// OCR output: blank lines separate paragraphs; wrapped lines are re-joined.
export function plainTextToParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .reduce((joined, line) => (joined ? joinLine(joined, line) : line), ''),
    )
    .filter(Boolean)
    .join('\n\n')
}
