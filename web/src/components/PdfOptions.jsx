import { useI18n } from '../i18n/I18nContext.jsx'

export default function PdfOptions({ options, onChange, disabled }) {
  const { t } = useI18n()
  const toggle = (name) => (e) => onChange({ ...options, [name]: e.target.checked })
  return (
    <div className="pdf-options">
      <label>
        <input type="checkbox" checked={options.ocr} disabled={disabled} onChange={toggle('ocr')} />
        {t('ocrOption')}
      </label>
      <label>
        <input type="checkbox" checked={options.pdfImages} disabled={disabled} onChange={toggle('pdfImages')} />
        {t('pdfImagesOption')}
      </label>
    </div>
  )
}
