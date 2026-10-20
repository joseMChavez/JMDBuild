import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LANGUAGES, translate } from './strings.js'

const STORAGE_KEY = 'texto-a-markdown:lang'
const I18nContext = createContext(null)
const isLanguage = (code) => LANGUAGES.some((language) => language.code === code)

// Saved choice first, then the browser languages, then Spanish.
function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // Storage can be blocked; detection below still works.
  }
  const preferred = (navigator.languages ?? [navigator.language]).map((tag) => tag?.slice(0, 2).toLowerCase())
  return preferred.find(isLanguage) ?? 'es'
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLanguage)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // Not remembering the language is harmless.
    }
  }, [lang])

  const t = useCallback((key, args) => translate(lang, key, args), [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
