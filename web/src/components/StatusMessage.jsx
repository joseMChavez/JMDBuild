import { useI18n } from '../i18n/I18nContext.jsx'

// Always mounted, so screen readers announce every change. Messages are stored as i18n keys and
// follow the language selector.
export default function StatusMessage({ status }) {
  const { t } = useI18n()
  return (
    <div className={`message ${status?.type ?? ''}`} role="status">
      {status ? t(status.key, status.args) : ''}
    </div>
  )
}
