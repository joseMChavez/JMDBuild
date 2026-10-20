import { useI18n } from '../i18n/I18nContext.jsx'
import { LANGUAGES } from '../i18n/strings.js'

export default function Header() {
  const { lang, setLang, t } = useI18n()
  return (
    <header className="top">
      <div className="brand">
        <span className="mark" aria-hidden="true">
          ↗
        </span>
        <span>Texto a Markdown</span>
      </div>
      <div className="top-right">
        <span className="privacy">{t('privacy')}</span>
        <select className="language" aria-label={t('languageLabel')} value={lang} onChange={(e) => setLang(e.target.value)}>
          {LANGUAGES.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
