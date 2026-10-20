import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { convert as convertDelimited, detectDelimiter, parseDelimited } from '../converters/delimited.js'
import { convertFile, isSupported } from '../converters/index.js'
import { rowsToTable } from '../converters/markdown.js'
import { resolvePartPath } from '../converters/ooxml.js'
import { bodyFontSize, extractLines, pageToMarkdown, plainTextToParagraphs } from '../converters/pdf-layout.js'
import { convert as convertPptx } from '../converters/pptx.js'
import { convert as convertText, decodeText } from '../converters/text.js'
import { convert as convertWorkbook } from '../converters/workbook.js'
import { translate } from '../i18n/strings.js'

const t = (key, args) => translate('es', key, args)
const fileFrom = (bytes, name) => ({
  name,
  arrayBuffer: async () => (typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes).buffer,
})

describe('file type detection', () => {
  it('accepts the supported extensions only', () => {
    expect(isSupported('Report.PDF')).toBe(true)
    expect(isSupported('notes.md')).toBe(true)
    expect(isSupported('photo.png')).toBe(false)
    expect(isSupported('x.constructor')).toBe(false)
  })

  it('rejects unsupported files with an i18n key', async () => {
    await expect(convertFile(fileFrom('', 'a.docx'), { t })).rejects.toMatchObject({ key: 'unsupported' })
  })
})

describe('rowsToTable', () => {
  it('escapes pipes and newlines and drops empty rows and trailing columns', () => {
    expect(rowsToTable([['a', 'b', ''], ['', '', ''], ['x|y', 'line\nbreak', '']])).toBe('| a | b |\n| --- | --- |\n| x\\|y | line<br>break |')
  })
})

describe('text files', () => {
  it('decodes UTF-8 and falls back to Windows-1252', () => {
    expect(decodeText(new TextEncoder().encode('canción'))).toBe('canción')
    expect(decodeText(new Uint8Array([0x63, 0x61, 0x6e, 0x63, 0x69, 0xf3, 0x6e]))).toBe('canción')
  })

  it('normalizes line endings and removes the BOM', async () => {
    const { markdown } = await convertText(fileFrom('﻿# Title\r\n\r\ntext\r\n', 'a.txt'))
    expect(markdown).toBe('# Title\n\ntext')
  })
})

describe('CSV and TSV', () => {
  it('detects semicolon-separated exports', () => {
    expect(detectDelimiter('nombre;importe\nAna;1,5', ',')).toBe(';')
    expect(detectDelimiter('a\tb\n1\t2', ',')).toBe('\t')
  })

  it('handles quoted delimiters, quotes and newlines', () => {
    expect(parseDelimited('a,"b,c","say ""hi""","multi\nline"\n1,2,3,4\n', ',')).toEqual([
      ['a', 'b,c', 'say "hi"', 'multi\nline'],
      ['1', '2', '3', '4'],
    ])
  })

  it('converts a CSV file into a Markdown table', async () => {
    const { markdown } = await convertDelimited(fileFrom('name;city\nAna;Roma\n', 'people.csv'))
    expect(markdown).toBe('| name | city |\n| --- | --- |\n| Ana | Roma |')
  })
})

describe('Excel workbooks', () => {
  it('converts every sheet into a section with a table', async () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Producto', 'Precio'], ['Café', 1.5], [], ['Té|verde', 2]]), 'Ventas')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['solo']]), 'Otra')
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    const { markdown, assets } = await convertWorkbook(fileFrom(new Uint8Array(bytes), 'book.xlsx'), { t })
    expect(markdown).toBe('## Ventas\n\n| Producto | Precio |\n| --- | --- |\n| Café | 1.5 |\n| Té\\|verde | 2 |\n\n## Otra\n\n| solo |\n| --- |')
    expect(assets).toEqual([])
  })
})

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
const rels = (items) =>
  `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items
    .map(([id, type, target]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`)
    .join('')}</Relationships>`
const shape = (paragraphs, ph = '') =>
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name="s"/><p:cNvSpPr/><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:txBody>${paragraphs}</p:txBody></p:sp>`
const para = (text, level) => `<a:p>${level ? `<a:pPr lvl="${level}"/>` : ''}<a:r><a:t>${text}</a:t></a:r></a:p>`

async function samplePptx() {
  const zip = new JSZip()
  // slide2.xml is shown first: presentation.xml, not the file name, defines the order.
  zip.file('ppt/presentation.xml', `<p:presentation ${NS}><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId1"/></p:sldIdLst></p:presentation>`)
  zip.file('ppt/_rels/presentation.xml.rels', rels([['rId1', 'slide', 'slides/slide1.xml'], ['rId2', 'slide', 'slides/slide2.xml']]))
  zip.file(
    'ppt/slides/slide2.xml',
    `<p:sld ${NS}><p:cSld><p:spTree>${shape(para('Intro'), '<p:ph type="title"/>')}${shape(para('Point') + para('Detail', 1))}<p:pic><p:nvPicPr><p:cNvPr id="4" name="Picture" descr="Logo"/></p:nvPicPr><p:blipFill><a:blip r:embed="rIdImg"/></p:blipFill></p:pic></p:spTree></p:cSld></p:sld>`,
  )
  zip.file('ppt/slides/_rels/slide2.xml.rels', rels([['rIdImg', 'image', '../media/image1.png'], ['rIdN', 'notesSlide', '../notesSlides/notesSlide1.xml']]))
  zip.file('ppt/notesSlides/notesSlide1.xml', `<p:notes ${NS}><p:cSld><p:spTree>${shape(para('Say hello'), '<p:ph type="body"/>')}</p:spTree></p:cSld></p:notes>`)
  zip.file(
    'ppt/slides/slide1.xml',
    `<p:sld ${NS}><p:cSld><p:spTree><p:graphicFrame><a:graphic><a:graphicData><a:tbl><a:tr><a:tc><a:txBody>${para('H1')}</a:txBody></a:tc><a:tc><a:txBody>${para('H2')}</a:txBody></a:tc></a:tr><a:tr><a:tc><a:txBody>${para('1')}</a:txBody></a:tc><a:tc><a:txBody>${para('2')}</a:txBody></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame></p:spTree></p:cSld></p:sld>`,
  )
  zip.file('ppt/media/image1.png', new Uint8Array([137, 80, 78, 71]))
  zip.file('ppt/media/layout-logo.png', new Uint8Array([137, 80, 78, 71]))
  return zip.generateAsync({ type: 'uint8array' })
}

describe('PowerPoint', () => {
  it('follows presentation order and keeps titles, levels, pictures, tables and notes', async () => {
    const { markdown, assets } = await convertPptx(fileFrom(await samplePptx(), 'deck.pptx'), { t })
    expect(markdown).toBe(
      [
        '## Diapositiva 1',
        '',
        '### Intro',
        '',
        '- Point',
        '  - Detail',
        '',
        '![Logo](assets/images/image1.png)',
        '',
        '> **Notas del orador**',
        '>',
        '> Say hello',
        '',
        '## Diapositiva 2',
        '',
        '| H1 | H2 |',
        '| --- | --- |',
        '| 1 | 2 |',
      ].join('\n'),
    )
    // Only pictures placed on slides are exported, not every file in ppt/media.
    expect(assets.map((asset) => asset.path)).toEqual(['assets/images/image1.png'])
  })

  it('resolves relationship targets', () => {
    expect(resolvePartPath('ppt/slides/slide1.xml', '../media/a.png')).toBe('ppt/media/a.png')
    expect(resolvePartPath('ppt/presentation.xml', '/ppt/slides/slide1.xml')).toBe('ppt/slides/slide1.xml')
  })
})

const item = (str, x, y, size = 10, hasEOL = true) => ({ str, transform: [size, 0, 0, size, x, y], width: str.length * size * 0.5, height: size, hasEOL })

describe('PDF layout', () => {
  it('rebuilds headings, paragraphs, bullets and hyphenated words', () => {
    const lines = extractLines([
      item('Annual report', 50, 800, 20),
      item('This paragraph wraps across two lines and con-', 50, 770),
      item('tinues here.', 50, 758),
      item('Second paragraph.', 50, 730),
      item('• first point', 60, 710),
      item('• second point', 60, 698),
    ])
    const out = pageToMarkdown(lines, bodyFontSize([lines]))
    expect(out).toBe('# Annual report\n\nThis paragraph wraps across two lines and continues here.\n\nSecond paragraph.\n\n- first point\n- second point')
  })

  it('splits indented short lines whose bullets are drawn as graphics', () => {
    const lines = extractLines([
      item('Sales grew in every region, with particular strength in the', 30, 667),
      item('south.', 30, 654),
      item('North: stable', 60, 628),
      item('South: growth', 60, 615),
    ])
    expect(pageToMarkdown(lines, 10)).toBe('Sales grew in every region, with particular strength in the south.\n\nNorth: stable\n\nSouth: growth')
  })

  it('joins items on the same baseline into one line', () => {
    const lines = extractLines([item('Hello', 50, 700, 10, false), item('world', 90, 700, 10, true)])
    expect(lines.map((line) => line.text)).toEqual(['Hello world'])
  })

  it('formats OCR text into paragraphs', () => {
    expect(plainTextToParagraphs('First line\nsecond line\n\nNew para-\ngraph\n')).toBe('First line second line\n\nNew paragraph')
  })
})
