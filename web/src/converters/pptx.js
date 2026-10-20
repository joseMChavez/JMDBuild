// PPTX: one "## Slide N" section per slide, in presentation order, with titles, bullet levels,
// tables, the slide's pictures in place and the speaker notes.
import JSZip from 'jszip'
import { ConversionError } from './errors.js'
import { imageRef, rowsToTable } from './markdown.js'
import { REL_NS, byName, readImage, readRels, readXml } from './ooxml.js'

const TITLE_TYPES = new Set(['title', 'ctrTitle'])

const numericOrder = (a, b) => a.localeCompare(b, undefined, { numeric: true })

// The order lives in presentation.xml; slide file names keep their creation number after reordering.
async function slidePaths(zip) {
  const presentation = await readXml(zip, 'ppt/presentation.xml')
  if (presentation) {
    const rels = await readRels(zip, 'ppt/presentation.xml')
    const ordered = byName(presentation, 'sldId')
      .map((slide) => rels.get(slide.getAttributeNS(REL_NS, 'id') || slide.getAttribute('r:id'))?.target)
      .filter((path) => path && zip.file(path))
    if (ordered.length) return ordered
  }
  return Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort(numericOrder)
}

function paragraphText(paragraph) {
  let text = ''
  for (const node of byName(paragraph, '*')) {
    if (node.localName === 't') text += node.textContent
    else if (node.localName === 'br') text += ' '
  }
  return text.trim()
}

function placeholderType(shape) {
  return byName(shape, 'ph')[0]?.getAttribute('type') || ''
}

// Visits shapes in drawing order, descending into groups and markup-compatibility wrappers.
function eachShape(container, visit) {
  for (const child of container.children) {
    if (child.localName === 'grpSp') eachShape(child, visit)
    else if (child.localName === 'AlternateContent') {
      if (child.firstElementChild) eachShape(child.firstElementChild, visit)
    } else if (['sp', 'graphicFrame', 'pic'].includes(child.localName)) visit(child)
  }
}

function shapeBlocks(shape) {
  const heading = TITLE_TYPES.has(placeholderType(shape))
  const blocks = []
  for (const paragraph of byName(shape, 'p')) {
    const text = paragraphText(paragraph)
    if (!text) continue
    if (heading) blocks.push({ list: false, text: `### ${text}` })
    else {
      const level = Number(byName(paragraph, 'pPr')[0]?.getAttribute('lvl')) || 0
      blocks.push({ list: true, text: `${'  '.repeat(level)}- ${text}` })
    }
  }
  return blocks
}

function tableBlock(frame) {
  const table = byName(frame, 'tbl')[0]
  if (!table) return null
  const rows = byName(table, 'tr').map((row) =>
    Array.from(row.children)
      .filter((cell) => cell.localName === 'tc')
      .map((cell) => byName(cell, 'p').map(paragraphText).filter(Boolean).join('\n')),
  )
  const markdown = rowsToTable(rows)
  return markdown ? { list: false, text: markdown } : null
}

async function pictureBlock(picture, zip, rels, images) {
  const blip = byName(picture, 'blip')[0]
  const target = rels.get(blip?.getAttributeNS(REL_NS, 'embed') || blip?.getAttribute('r:embed'))?.target
  if (!target) return null
  if (!images.has(target)) images.set(target, await readImage(zip, target))
  const asset = images.get(target)
  if (!asset) return null
  const alt = byName(picture, 'cNvPr')[0]?.getAttribute('descr') || undefined
  return { list: false, text: imageRef(asset, alt) }
}

async function notesText(zip, rels) {
  const notesPath = [...rels.values()].find((rel) => rel.type.endsWith('/notesSlide'))?.target
  const notes = notesPath && (await readXml(zip, notesPath))
  if (!notes) return []
  return byName(notes, 'sp')
    .filter((shape) => placeholderType(shape) === 'body')
    .flatMap((shape) => byName(shape, 'p').map(paragraphText))
    .filter(Boolean)
}

function joinBlocks(blocks) {
  return blocks.map((block, i) => (i === 0 ? '' : block.list && blocks[i - 1].list ? '\n' : '\n\n') + block.text).join('')
}

export async function convert(file, { t }) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const paths = await slidePaths(zip)
  if (!paths.length) throw new ConversionError('noSlides')
  const images = new Map()
  const slides = []
  for (const [index, path] of paths.entries()) {
    const doc = await readXml(zip, path)
    const tree = doc && byName(doc, 'spTree')[0]
    if (!tree) continue
    const rels = await readRels(zip, path)
    const shapes = []
    eachShape(tree, (shape) => shapes.push(shape))
    const blocks = []
    for (const shape of shapes) {
      if (shape.localName === 'sp') blocks.push(...shapeBlocks(shape))
      else if (shape.localName === 'graphicFrame') blocks.push(tableBlock(shape))
      else blocks.push(await pictureBlock(shape, zip, rels, images))
    }
    const notes = await notesText(zip, rels)
    if (notes.length) blocks.push({ list: false, text: `> **${t('notes')}**\n>\n${notes.map((line) => `> ${line}`).join('\n>\n')}` })
    slides.push(`## ${t('slide')} ${index + 1}\n\n${joinBlocks(blocks.filter(Boolean))}`.trimEnd())
  }
  return { markdown: slides.join('\n\n'), assets: [...images.values()].filter(Boolean) }
}
