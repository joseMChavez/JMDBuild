// Markdown helpers shared by every converter.

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg|bmp|tiff?)$/i

export const isImagePath = (path) => IMAGE_EXT.test(path)

export const assetPath = (path) => `assets/images/${path.split('/').pop().replace(/[^\w.-]+/g, '_')}`

export const fileNameOf = (path) => path.split('/').pop()

export const imageRef = (asset, alt = fileNameOf(asset.path)) => `![${alt.replace(/[[\]\n]/g, ' ').trim()}](${asset.path})`

export function escapeCell(value) {
  return String(value ?? '')
    .replace(/\r\n?|\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim()
}

// GFM table whose first row is the header. Fully empty rows and trailing empty columns are dropped.
export function rowsToTable(rows) {
  const cells = rows.map((row) => Array.from(row, (value) => escapeCell(value))).filter((row) => row.some(Boolean))
  if (!cells.length) return ''
  let width = Math.max(...cells.map((row) => row.length))
  while (width > 1 && cells.every((row) => !row[width - 1])) width--
  const fit = (row) => Array.from({ length: width }, (_, i) => row[i] ?? '')
  return [fit(cells[0]), Array(width).fill('---'), ...cells.slice(1).map(fit)].map((row) => `| ${row.join(' | ')} |`).join('\n')
}

export function appendImageSection(markdown, assets, title) {
  if (!assets.length) return markdown
  return `${markdown}\n\n## ${title}\n\n${assets.map((asset) => imageRef(asset)).join('\n\n')}`
}
