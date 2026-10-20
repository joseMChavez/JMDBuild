import { useEffect, useState } from 'react'
import FileDrop from './components/FileDrop.jsx'
import Header from './components/Header.jsx'
import LegalNotice from './components/LegalNotice.jsx'
import ModeTabs, { panelId, tabId } from './components/ModeTabs.jsx'
import PdfOptions from './components/PdfOptions.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import RichTextEditor from './components/RichTextEditor.jsx'
import StatusMessage from './components/StatusMessage.jsx'
import { ConversionError } from './converters/errors.js'
import { htmlToMarkdown, imagesToAssets } from './converters/html-to-markdown.js'
import { convertFile, isSupported } from './converters/index.js'
import { useI18n } from './i18n/I18nContext.jsx'
import { LANGUAGES } from './i18n/strings.js'
import { buildDownload, saveBlob } from './lib/download.js'
import { clearPending, loadPending, savePending } from './lib/storage.js'

const baseName = (name) => name.replace(/\.[^.]+$/, '')

export default function App() {
  const { lang, t } = useI18n()
  const [mode, setMode] = useState('file')
  const [options, setOptions] = useState({ ocr: true, pdfImages: true })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  // { key, args, type }: an i18n key, so the message follows the language selector.
  const [status, setStatus] = useState(null)

  // Restore a conversion left pending by a previous visit.
  useEffect(() => {
    let active = true
    loadPending()
      .then((saved) => {
        if (!active || !saved?.markdown) return
        setResult(saved)
        setStatus({ key: 'restored', type: 'success' })
      })
      .catch(() => active && setStatus({ key: 'dbUnavailable', type: 'error' }))
    return () => {
      active = false
    }
  }, [])

  // A file dropped next to the drop zone would make the browser navigate away and lose the result.
  useEffect(() => {
    const block = (e) => {
      if (Array.from(e.dataTransfer?.types ?? []).includes('Files')) e.preventDefault()
    }
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    return () => {
      window.removeEventListener('dragover', block)
      window.removeEventListener('drop', block)
    }
  }, [])

  async function keep(data, successKey) {
    setResult(data)
    try {
      await savePending(data)
      setStatus({ key: successKey, type: 'success' })
    } catch {
      setStatus({ key: 'notStored', type: 'error' })
    }
  }

  async function handleFile(file) {
    if (!isSupported(file?.name)) {
      setStatus({ key: 'unsupported', type: 'error' })
      return
    }
    setBusy(true)
    setResult(null)
    setStatus({ key: 'processing', type: 'info' })
    try {
      const converted = await convertFile(file, {
        ...options,
        t,
        ocrLanguage: LANGUAGES.find((language) => language.code === lang).ocr,
        onProgress: (key, args) => setStatus({ key, args, type: 'info' }),
      })
      if (!converted.markdown.trim()) throw new ConversionError('emptyFile')
      await keep({ name: `${baseName(file.name)}.md`, ...converted }, 'converted')
    } catch (error) {
      setStatus({ key: error instanceof ConversionError ? error.key : 'readError', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function handleText(html) {
    const { markdown, images } = htmlToMarkdown(html)
    if (!markdown) {
      setStatus({ key: 'emptyText', type: 'error' })
      return false
    }
    await keep({ name: t('textFileName'), markdown, assets: imagesToAssets(images) }, 'textConverted')
    return true
  }

  async function handleDownload() {
    let download
    try {
      download = await buildDownload(result)
    } catch {
      setStatus({ key: 'zipError', type: 'error' })
      return
    }
    saveBlob(download.blob, download.filename)
    setResult(null)
    try {
      await clearPending()
      setStatus({ key: 'downloaded', type: 'success' })
    } catch {
      setStatus({ key: 'dbError', type: 'error' })
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.markdown)
      setStatus({ key: 'copied', type: 'success' })
    } catch {
      setStatus({ key: 'copyError', type: 'error' })
    }
  }

  async function handleClear() {
    setResult(null)
    try {
      await clearPending()
      setStatus(null)
    } catch {
      setStatus({ key: 'dbError', type: 'error' })
    }
  }

  return (
    <div className="shell">
      <Header />
      <main>
        <section className="hero">
          <div className="eyebrow">{t('eyebrow')}</div>
          <h1>
            {t('titleLine1')}
            <br />
            {t('titleLine2')}
          </h1>
          <p>{t('lead')}</p>
        </section>
        <section className="card" aria-label={t('converterLabel')}>
          <ModeTabs mode={mode} onChange={setMode} />
          <div id={panelId('file')} role="tabpanel" aria-labelledby={tabId('file')} hidden={mode !== 'file'}>
            <FileDrop busy={busy} onFile={handleFile} />
            <PdfOptions options={options} onChange={setOptions} disabled={busy} />
          </div>
          <div id={panelId('text')} role="tabpanel" aria-labelledby={tabId('text')} hidden={mode !== 'text'}>
            <RichTextEditor busy={busy} onConvert={handleText} />
          </div>
          <StatusMessage status={status} />
          {result && <ResultPanel result={result} onClear={handleClear} onCopy={handleCopy} onDownload={handleDownload} />}
        </section>
        <p className="notice">{t('notice')}</p>
        <LegalNotice />
      </main>
      <footer>{t('footer')}</footer>
    </div>
  )
}
