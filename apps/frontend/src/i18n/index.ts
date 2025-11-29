import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import vi from './locales/vi.json'

// Get saved language from localStorage or default to browser language
const getDefaultLocale = (): string => {
  const saved = localStorage.getItem('locale')
  if (saved) return saved
  
  // Try to detect browser language
  const browserLang = navigator.language.split('-')[0]
  return ['en', 'vi'].includes(browserLang) ? browserLang : 'en'
}

export const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    vi,
  },
  // Enable global scope
  globalInjection: true,
})

export default i18n

