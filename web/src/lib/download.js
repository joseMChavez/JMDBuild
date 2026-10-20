// A plain .md file, or a ZIP with the .md and assets/images/ when there are images.
export async function buildDownload({ name, markdown, assets }) {
  if (!assets?.length) return { blob: new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), filename: name }
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file(name, markdown, { compression: 'DEFLATE' })
  for (const asset of assets) zip.file(asset.path, asset.blob)
  return { blob: await zip.generateAsync({ type: 'blob' }), filename: name.replace(/\.md$/i, '.zip') }
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(link)
  link.click()
  link.remove()
  // Large blobs can take a while to hand over to the download manager.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
