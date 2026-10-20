// TXT and Markdown files pass through unchanged apart from encoding and line endings.

// UTF-8 first; files saved by older Windows editors fall back to Windows-1252 so accents survive.
export function decodeText(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

export const normalizeNewlines = (text) => text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')

export async function convert(file) {
  return { markdown: normalizeNewlines(decodeText(await file.arrayBuffer())).trimEnd(), assets: [] }
}
