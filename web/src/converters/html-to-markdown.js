// Converts the rich-text editor's HTML (typed, or pasted from Word, Google Docs or a web page) into
// standard Markdown with no presentational HTML. Inline font sizes of 18px and above become heading
// levels (largest first); underline has no Markdown equivalent and maps to bold.
import { rowsToTable } from './markdown.js'

const HEADING_MIN_PX = 18
const UNIT_TO_PX = { px: 1, pt: 4 / 3, em: 16, rem: 16 }
const SKIP = new Set(['script', 'style', 'template', 'noscript', 'head', 'meta', 'link', 'title', 'svg', 'math', 'iframe', 'object', 'button', 'select', 'input', 'textarea'])
const BLOCKS = new Set(['p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'figure', 'figcaption', 'address', 'dl', 'dt', 'dd', 'center', 'details', 'summary', 'form', 'fieldset', 'legend'])
const UNSAFE_URL = /^\s*(javascript|vbscript|data|file):/i
const PASTED_IMAGE = /^data:image\/(png|jpeg|gif|webp);base64,/i

export function cssFontSizeToPx(value) {
  const match = /^\s*(\d*\.?\d+)\s*(px|pt|r?em)?\s*$/i.exec(value || '')
  return match ? Math.round(parseFloat(match[1]) * UNIT_TO_PX[(match[2] || 'px').toLowerCase()] * 100) / 100 : NaN
}

const ownFontSize = (el) => cssFontSizeToPx(el.style?.fontSize)
const isHeadingTag = (tag) => /^h[1-6]$/.test(tag)

// Sizes that carry text, largest first, mapped to "#".."######". When most of the text is already at
// 18px or more (typical of a web-page paste), that body size is not treated as a heading.
function headingLevels(body) {
  const chars = new Map()
  const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.nodeValue.replace(/[\s​]+/g, '').length
    if (!length) continue
    let size = null
    let inHeading = false
    for (let el = node.parentElement; el && el !== body; el = el.parentElement) {
      if (isHeadingTag(el.localName)) inHeading = true
      if (size === null && Number.isFinite(ownFontSize(el))) size = ownFontSize(el)
    }
    if (!inHeading) chars.set(size, (chars.get(size) || 0) + length)
  }
  const total = [...chars.values()].reduce((sum, count) => sum + count, 0)
  const [bodySize, bodyChars] = [...chars].reduce((best, entry) => (entry[1] > best[1] ? entry : best), [null, 0])
  const bodyIsLarge = bodySize >= HEADING_MIN_PX && bodyChars >= 200 && bodyChars >= total / 2
  const sizes = [...chars.keys()].filter((size) => size >= HEADING_MIN_PX && !(bodyIsLarge && size <= bodySize)).sort((a, b) => b - a)
  return new Map(sizes.map((size, i) => [size, '#'.repeat(Math.min(i + 1, 6))]))
}

// True when the element holds text at `size` itself, not only inside children with another size.
function hasTextAtSize(node, size) {
  if (node.nodeType === Node.TEXT_NODE) return /[^\s​]/.test(node.nodeValue)
  if (node.nodeType !== Node.ELEMENT_NODE) return false
  const own = ownFontSize(node)
  if (Number.isFinite(own) && own !== size) return false
  return Array.from(node.childNodes).some((child) => hasTextAtSize(child, size))
}

// Google Docs wraps every paste in <b style="font-weight:normal">, so the style wins over the tag.
function inlineFormat(el, tag) {
  const style = el.style ?? {}
  let bold = tag === 'b' || tag === 'strong'
  if (style.fontWeight) bold = style.fontWeight === 'bold' || style.fontWeight === 'bolder' || Number(style.fontWeight) >= 600
  let italic = tag === 'i' || tag === 'em'
  if (style.fontStyle) italic = style.fontStyle === 'italic' || style.fontStyle === 'oblique'
  const underline = tag === 'u' || tag === 'ins' || /underline/.test(`${style.textDecoration || ''} ${style.textDecorationLine || ''}`)
  return { bold: bold || underline, italic }
}

// Markers hug the text: "**word** " instead of "**word **", which CommonMark would not render.
function emphasize(text, marker) {
  return text
    .split(/(\n{2,})/)
    .map((part) => {
      const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(part)
      if (!core || /^(#{1,6} |[-*+] |\d+[.)] |> |\||```)/.test(core)) return part
      return `${lead}${marker}${core}${marker}${trail}`
    })
    .join('')
}

function codeSpan(text) {
  const fence = '`'.repeat(Math.max(0, ...(text.match(/`+/g) || []).map((run) => run.length)) + 1)
  const pad = /^`|`$/.test(text) ? ' ' : ''
  return `${fence}${pad}${text}${pad}${fence}`
}

function preText(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  if (node.localName === 'br') return '\n'
  const text = Array.from(node.childNodes, preText).join('')
  return BLOCKS.has(node.localName) && !text.endsWith('\n') ? `${text}\n` : text
}

function codeBlock(pre) {
  const text = preText(pre).replace(/\n+$/, '')
  const classes = `${pre.className} ${pre.querySelector('code')?.className || ''}`
  const language = /(?:^|\s)(?:language|lang)-([\w+#-]+)/.exec(classes)?.[1] || ''
  const fence = '`'.repeat(Math.max(2, ...(text.match(/`{3,}/g) || []).map((run) => run.length)) + 1)
  return `\n\n${fence}${language}\n${text}\n${fence}\n\n`
}

function link(el, inner) {
  const href = (el.getAttribute('href') || '').trim()
  const [, lead, text, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)
  if (!text || !href || href.startsWith('#') || UNSAFE_URL.test(href) || text.includes('\n\n')) return inner
  const url = /[\s()<>]/.test(href) ? `<${href.replace(/</g, '%3C').replace(/>/g, '%3E')}>` : href
  return `${lead}[${text}](${url})${trail}`
}

function image(el, ctx) {
  const src = el.getAttribute('src') || ''
  const alt = (el.getAttribute('alt') || '').replace(/[[\]\n]/g, ' ').trim()
  if (/^https?:\/\//i.test(src)) return `![${alt}](${/[\s()]/.test(src) ? `<${src}>` : src})`
  const pasted = PASTED_IMAGE.exec(src)
  if (!pasted) return ''
  const name = `pasted-${ctx.images.length + 1}.${pasted[1].toLowerCase() === 'jpeg' ? 'jpg' : pasted[1].toLowerCase()}`
  const path = `assets/images/${name}`
  ctx.images.push({ path, dataUrl: src })
  return `![${alt || name}](${path})`
}

function indentLines(text, pad, skipFirst = false) {
  return text
    .split('\n')
    .map((line, i) => (line && !(skipFirst && i === 0) ? pad + line : line))
    .join('\n')
}

function listItem(li, marker, ctx) {
  const pad = ' '.repeat(marker.length + 1)
  const nested = []
  let text = ''
  for (const child of li.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE && (child.localName === 'ul' || child.localName === 'ol')) nested.push(listToMarkdown(child, ctx))
    else text += walk(child, { ...ctx, inList: true })
  }
  let out = `${marker} ${indentLines(text.replace(/\n{3,}/g, '\n\n').trim(), pad, true)}`
  for (const list of nested) if (list) out += `\n${indentLines(list, pad)}`
  return { text: out, pad }
}

function listToMarkdown(list, ctx) {
  const ordered = list.localName === 'ol'
  let number = ordered ? parseInt(list.getAttribute('start'), 10) || 1 : 0
  const items = []
  for (const child of list.childNodes) {
    if (child.nodeType !== Node.ELEMENT_NODE) {
      const text = walk(child, { ...ctx, inList: true }).trim()
      if (text) items.push({ text: `- ${text}`, pad: '  ' })
    } else if (child.localName === 'ul' || child.localName === 'ol') {
      // Browsers' "indent" command nests a list directly inside the parent list, not inside an <li>.
      const nested = listToMarkdown(child, ctx)
      const previous = items.at(-1)
      if (previous && nested) previous.text += `\n${indentLines(nested, previous.pad)}`
      else if (nested) items.push({ text: nested, pad: '' })
    } else {
      items.push(listItem(child, ordered ? `${number++}.` : '-', ctx))
    }
  }
  return items.map((item) => item.text).join('\n')
}

function tableToMarkdown(table, ctx) {
  const rows = Array.from(table.rows, (row) =>
    Array.from(row.cells, (cell) =>
      walk(cell, { ...ctx, inTable: true })
        .replace(/ *\n */g, '\n')
        .replace(/\n{2,}/g, '\n')
        .trim(),
    ),
  )
  return rowsToTable(rows)
}

function children(el, ctx) {
  return Array.from(el.childNodes, (child) => walk(child, ctx)).join('')
}

function walk(node, ctx) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/​/g, '').replace(/[ \t\r\n\f]+/g, ' ').replace(/ /g, ' ')
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node
  const tag = el.localName
  if (SKIP.has(tag)) return ''
  if (tag === 'br') return ctx.inTable ? '\n' : '  \n'
  if (tag === 'hr') return ctx.inTable ? '' : '\n\n---\n\n'
  if (tag === 'img') return image(el, ctx)
  if (tag === 'pre' && !ctx.inTable) return codeBlock(el)
  if (tag === 'code' || tag === 'kbd' || tag === 'samp') return codeSpan(el.textContent.replace(/\s+/g, ' '))
  if ((tag === 'ul' || tag === 'ol') && !ctx.inTable) return `\n\n${listToMarkdown(el, ctx)}\n\n`
  if (tag === 'li') return `\n\n${listItem(el, '-', ctx).text}\n\n`
  if (tag === 'table' && !ctx.inTable) return `\n\n${tableToMarkdown(el, ctx)}\n\n`

  const size = ownFontSize(el)
  const canHead = !ctx.inHeading && !ctx.inList && !ctx.inTable
  let heading = null
  if (isHeadingTag(tag) && canHead) heading = '#'.repeat(Number(tag[1]))
  else if (canHead && Number.isFinite(size) && size !== ctx.size && ctx.levels.has(size) && hasTextAtSize(el, size)) heading = ctx.levels.get(size)
  const format = inlineFormat(el, tag)
  // A heading tag that cannot become a heading (inside a list or table) is kept as bold text.
  if (isHeadingTag(tag) && !heading) format.bold = true

  const inner = children(el, {
    ...ctx,
    size: Number.isFinite(size) ? size : ctx.size,
    bold: ctx.bold || format.bold || Boolean(heading),
    italic: ctx.italic || format.italic,
    inHeading: ctx.inHeading || Boolean(heading),
  })
  if (heading) {
    const text = inner.replace(/\s+/g, ' ').trim()
    return text ? `\n\n${heading} ${text}\n\n` : ''
  }
  let out = inner
  if (format.italic && !ctx.italic) out = emphasize(out, '*')
  if (format.bold && !ctx.bold) out = emphasize(out, '**')
  if (tag === 'a') return link(el, out)
  if (tag === 'blockquote' && !ctx.inTable) {
    const quoted = cleanup(out)
    return quoted ? `\n\n${quoted.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n')}\n\n` : ''
  }
  if (BLOCKS.has(tag) || tag === 'blockquote') return ctx.inTable ? `\n${out.trim()}\n` : `\n\n${out.trim()}\n\n`
  return out
}

// <b>a</b><b>b</b> would otherwise become "**a****b**".
function mergeAdjacentFormatting(root) {
  for (const el of root.querySelectorAll('b, strong, i, em, u')) {
    const previous = el.previousSibling
    if (previous?.nodeType === Node.ELEMENT_NODE && previous.localName === el.localName && previous.getAttribute('style') === el.getAttribute('style')) {
      previous.append(...el.childNodes)
      el.remove()
    }
  }
}

function cleanup(markdown) {
  return markdown
    .replace(/^[ \t]+$/gm, '')
    .replace(/(\S)( +)\n/g, (_, char, spaces) => (spaces.length >= 2 ? `${char}  \n` : `${char}\n`))
    .replace(/ {2}\n(?=\n|$)/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Returns the Markdown and the pasted images (data URLs) it references under assets/images/.
export function htmlToMarkdown(html) {
  const body = new DOMParser().parseFromString(html, 'text/html').body
  mergeAdjacentFormatting(body)
  const images = []
  const ctx = { size: null, bold: false, italic: false, inHeading: false, inList: false, inTable: false, levels: headingLevels(body), images }
  return { markdown: cleanup(children(body, ctx)), images }
}

export function imagesToAssets(images) {
  return images.map(({ path, dataUrl }) => {
    const [, type, base64] = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl)
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
    return { path, blob: new Blob([bytes], { type }) }
  })
}
