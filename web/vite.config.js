import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `vite preview` sends the same security headers as Vercel, so the CSP is exercised locally too.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
const previewHeaders = Object.fromEntries(vercel.headers.find((rule) => rule.source === '/(.*)').headers.map(({ key, value }) => [key, value]))

export default defineConfig({
  plugins: [react()],
  preview: { headers: previewHeaders },
  test: {
    environment: 'jsdom',
  },
})
