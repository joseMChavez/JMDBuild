import { useRef } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'

export const MODES = ['file', 'text']
const LABELS = { file: 'fileTab', text: 'textTab' }

export const tabId = (mode) => `tab-${mode}`
export const panelId = (mode) => `panel-${mode}`

// WAI-ARIA tabs: arrow keys, Home and End move between modes.
export default function ModeTabs({ mode, onChange }) {
  const { t } = useI18n()
  const refs = useRef({})

  function onKeyDown(e) {
    const index = MODES.indexOf(mode)
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: MODES.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const target = MODES[(next + MODES.length) % MODES.length]
    onChange(target)
    refs.current[target]?.focus()
  }

  return (
    <div className="mode-switch" role="tablist" aria-label={t('modeLabel')}>
      {MODES.map((value) => (
        <button
          key={value}
          ref={(el) => (refs.current[value] = el)}
          id={tabId(value)}
          type="button"
          role="tab"
          aria-selected={mode === value}
          aria-controls={panelId(value)}
          tabIndex={mode === value ? 0 : -1}
          className={mode === value ? 'active' : undefined}
          onClick={() => onChange(value)}
          onKeyDown={onKeyDown}
        >
          {t(LABELS[value])}
        </button>
      ))}
    </div>
  )
}
