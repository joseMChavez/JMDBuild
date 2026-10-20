// Copies the PDF.js runtime data (CMaps, standard fonts, wasm decoders, ICC
// profiles) into public/ so they are served from our own origin instead of a CDN.
import { cpSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'))
const target = join(import.meta.dirname, '..', 'public', 'pdfjs')

rmSync(target, { recursive: true, force: true })
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(join(pdfjsRoot, dir), join(target, dir), { recursive: true })
}
console.log(`PDF.js assets copied to ${target}`)
