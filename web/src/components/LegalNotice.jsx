import { useI18n } from '../i18n/I18nContext.jsx'

const SECTIONS = [
  ['legalScope', 'legalScopeText'],
  ['legalStorage', 'legalStorageText'],
  ['legalNetwork', 'legalNetworkText'],
  ['legalUse', 'legalUseText'],
  ['legalController', 'legalControllerText'],
]

export default function LegalNotice() {
  const { t } = useI18n()
  return (
    <details className="legal-notice">
      <summary>{t('legalTitle')}</summary>
      <div className="legal-body">
        {SECTIONS.map(([title, text]) => (
          <section key={title}>
            <h3>{t(title)}</h3>
            <p>{t(text)}</p>
          </section>
        ))}
        <p>
          {t('legalReference')}{' '}
          <a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj" target="_blank" rel="noopener noreferrer">
            {t('legalSource')}
          </a>
          .
        </p>
      </div>
    </details>
  )
}
