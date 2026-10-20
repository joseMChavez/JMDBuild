import { describe, expect, it } from 'vitest'
import { cssFontSizeToPx, htmlToMarkdown, imagesToAssets } from '../converters/html-to-markdown.js'

const md = (html) => htmlToMarkdown(html).markdown

describe('htmlToMarkdown', () => {
  it('keeps bold and italic and maps underline to bold', () => {
    expect(md('<b>bold</b> <i>italic</i> <u>under</u>')).toBe('**bold** *italic* **under**')
  })

  it('does not double-wrap nested or adjacent formatting', () => {
    expect(md('<b><u>x</u></b>')).toBe('**x**')
    expect(md('<b><b>x</b></b>')).toBe('**x**')
    expect(md('<b>a</b><b>b</b>')).toBe('**ab**')
  })

  it('keeps emphasis markers next to the text', () => {
    expect(md('<b>hello </b>world')).toBe('**hello** world')
    expect(md('say<i> hi</i>')).toBe('say *hi*')
  })

  it('turns font sizes of 18px and above into headings, largest first', () => {
    const html = '<div><span style="font-size: 32px">Title</span></div><div><span style="font-size: 24px">Section</span></div><div><span style="font-size: 14px">small</span> text</div>'
    expect(md(html)).toBe('# Title\n\n## Section\n\nsmall text')
  })

  it('never leaves presentational HTML in the output', () => {
    expect(md('<span style="font-size: 12px; color: red">plain</span>')).toBe('plain')
  })

  it('converts pt sizes from Word and Google Docs', () => {
    expect(cssFontSizeToPx('18pt')).toBe(24)
    expect(md('<p><span style="font-size:20pt">Big</span></p><p><span style="font-size:11pt">Body</span></p>')).toBe('# Big\n\nBody')
  })

  it('does not treat a large body size from a web paste as headings', () => {
    const body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(6)
    const html = `<p style="font-size:32px">Heading</p><p style="font-size:18px">${body}</p><p style="font-size:18px">${body}</p>`
    const out = md(html)
    expect(out.startsWith('# Heading\n\nLorem')).toBe(true)
    expect(out).not.toMatch(/^## /m)
  })

  it('ignores the Google Docs bold wrapper but keeps styled bold spans', () => {
    const html = '<b style="font-weight:normal" id="docs-internal-guid-1"><p><span style="font-weight:400">Plain</span> <span style="font-weight:700">strong</span></p></b>'
    expect(md(html)).toBe('Plain **strong**')
  })

  it('does not nest a size heading inside a heading tag', () => {
    expect(md('<h2><span style="font-size:20pt;font-weight:700">Docs heading</span></h2>')).toBe('## Docs heading')
  })

  it('converts lists, including nesting and start numbers', () => {
    expect(md('<ul><li>a</li><li>b<ul><li>c</li></ul></li></ul>')).toBe('- a\n- b\n  - c')
    expect(md('<ol start="3"><li>x</li><li>y</li></ol>')).toBe('3. x\n4. y')
    // Chrome's indent command nests the list directly inside the parent list.
    expect(md('<ol><li>one</li><ol><li>sub</li></ol><li>two</li></ol>')).toBe('1. one\n   1. sub\n2. two')
  })

  it('keeps line breaks as hard breaks and paragraphs as blank lines', () => {
    expect(md('<div>line one<br>line two</div><div>next</div>')).toBe('line one  \nline two\n\nnext')
    expect(md('first<div><br></div><div>second</div>')).toBe('first\n\nsecond')
  })

  it('collapses source whitespace from pasted HTML', () => {
    expect(md('<p>\n      Hello\n      world\n    </p>')).toBe('Hello world')
  })

  it('converts tables, links, code and quotes', () => {
    expect(md('<table><tr><th>A</th><th>B|C</th></tr><tr><td>1</td><td>2</td></tr></table>')).toBe('| A | B\\|C |\n| --- | --- |\n| 1 | 2 |')
    expect(md('<a href="https://example.com">site</a>')).toBe('[site](https://example.com)')
    expect(md('<a href="javascript:alert(1)">bad</a>')).toBe('bad')
    expect(md('<p>use <code>npm i</code></p><pre class="language-js">const a = 1\nconst b = 2</pre>')).toBe('use `npm i`\n\n```js\nconst a = 1\nconst b = 2\n```')
    expect(md('<blockquote><p>quoted</p><p>twice</p></blockquote>')).toBe('> quoted\n>\n> twice')
  })

  it('keeps repeated text', () => {
    expect(md('<p>same</p><p>same</p>')).toBe('same\n\nsame')
  })

  it('extracts pasted images as assets', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo='
    const { markdown, images } = htmlToMarkdown(`<p>Shot:</p><img src="${png}" alt="chart">`)
    expect(markdown).toBe('Shot:\n\n![chart](assets/images/pasted-1.png)')
    const [asset] = imagesToAssets(images)
    expect(asset.path).toBe('assets/images/pasted-1.png')
    expect(asset.blob.size).toBe(8)
  })

  it('strips the zero-width caret marker and returns empty for blank input', () => {
    expect(md('<span style="font-size:24px">​</span><br>')).toBe('')
  })
})
