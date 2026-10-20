// Helpers for reading Office Open XML packages (PPTX, XLSX) opened with JSZip.
import { assetPath, isImagePath } from './markdown.js'

export const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

export function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  return doc.getElementsByTagName('parsererror').length ? null : doc
}

export const byName = (node, localName) => Array.from(node.getElementsByTagNameNS('*', localName))

export async function readXml(zip, path) {
  const file = zip.file(path)
  return file ? parseXml(await file.async('text')) : null
}

// "ppt/slides/slide1.xml" + "../media/image1.png" -> "ppt/media/image1.png"
export function resolvePartPath(fromPart, target) {
  const parts = target.startsWith('/') ? [] : fromPart.split('/').slice(0, -1)
  for (const segment of target.split('/')) {
    if (segment === '..') parts.pop()
    else if (segment && segment !== '.') parts.push(segment)
  }
  return parts.join('/')
}

export function relsPathFor(part) {
  const slash = part.lastIndexOf('/')
  return `${part.slice(0, slash + 1)}_rels/${part.slice(slash + 1)}.rels`
}

// Map of relationship id -> { type, target } with internal targets resolved to package paths.
export async function readRels(zip, part) {
  const rels = new Map()
  const doc = await readXml(zip, relsPathFor(part))
  if (!doc) return rels
  for (const rel of byName(doc, 'Relationship')) {
    const target = rel.getAttribute('Target') || ''
    const external = rel.getAttribute('TargetMode') === 'External'
    rels.set(rel.getAttribute('Id'), { type: rel.getAttribute('Type') || '', target: external ? null : resolvePartPath(part, target) })
  }
  return rels
}

export async function readImage(zip, path) {
  const file = path && isImagePath(path) ? zip.file(path) : null
  return file ? { path: assetPath(path), blob: await file.async('blob') } : null
}

export async function extractMedia(zip, folder) {
  const paths = Object.keys(zip.files)
    .filter((path) => path.startsWith(folder) && !zip.files[path].dir && isImagePath(path))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return Promise.all(paths.map((path) => readImage(zip, path)))
}
