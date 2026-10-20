import { useRef, useState } from 'react'
import { ACCEPT } from '../converters/index.js'
import { useI18n } from '../i18n/I18nContext.jsx'

const FORMATS = ['TXT', 'MD', 'PPTX', 'XLSX', 'XLS', 'PDF', 'CSV', 'TSV']

export default function FileDrop({ busy, onFile }) {
  const { t } = useI18n()
  const input = useRef(null)
  const [dragging, setDragging] = useState(false)

  function onDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = busy ? 'none' : 'copy'
    if (!busy) setDragging(true)
  }

  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (!busy && e.dataTransfer.files.length) onFile(e.dataTransfer.files[0])
  }

  return (
    <div className={`dropzone${dragging ? ' drag' : ''}`} onDragEnter={onDragOver} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div className="upload-icon" aria-hidden="true">
        ↑
      </div>
      <strong>{t('dropTitle')}</strong>
      <p>{t('dropSub')}</p>
      <button className="button" type="button" disabled={busy} onClick={() => input.current.click()}>
        {busy ? (
          <>
            <span className="loading" aria-hidden="true" />
            {t('processing')}
          </>
        ) : (
          t('choose')
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        hidden
        aria-label={t('choose')}
        onChange={(e) => {
          if (e.target.files.length) onFile(e.target.files[0])
          e.target.value = ''
        }}
      />
      <div className="formats" aria-hidden="true">
        {FORMATS.map((format) => (
          <span key={format} className="tag">
            {format}
          </span>
        ))}
      </div>
    </div>
  )
}
