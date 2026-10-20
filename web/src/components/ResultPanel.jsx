import { useMemo } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import { formatSize } from '../lib/download.js'

export default function ResultPanel({ result, onClear, onCopy, onDownload }) {
  const { t } = useI18n()
  const { name, markdown, assets = [] } = result
  const size = useMemo(() => new Blob([markdown]).size, [markdown])
  return (
    <div className="result">
      <div className="result-head">
        <div className="file-info">
          <div className="file-name">{name}</div>
          <div className="file-meta">{assets.length ? t('zipInfo', { n: assets.length }) : `${t('mdInfo')} · ${formatSize(size)}`}</div>
        </div>
        <div className="actions">
          <button className="button secondary" type="button" onClick={onClear}>
            {t('clear')}
          </button>
          <button className="button secondary" type="button" onClick={onCopy}>
            {t('copy')}
          </button>
          <button className="button" type="button" onClick={onDownload}>
            {assets.length ? t('zipDownload') : t('download')}
          </button>
        </div>
      </div>
      <div className="preview" tabIndex={0} aria-label={name}>
        <pre>{markdown}</pre>
      </div>
    </div>
  )
}
