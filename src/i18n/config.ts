import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from '@/locales/en/common.json'
import zhCommon from '@/locales/zh/common.json'

// 从 localStorage 读取保存的语言，如果没有则使用默认值
const getStoredLanguage = (): string => {
  const stored = localStorage.getItem('i18n-language')
  if (stored && (stored === 'en' || stored === 'zh')) {
    return stored
  }
  // 如果没有保存的语言，尝试使用浏览器语言
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

const defaultLanguage = getStoredLanguage()

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    zh: { common: zhCommon },
  },
  fallbackLng: 'en',
  lng: defaultLanguage,
  interpolation: {
    escapeValue: false,
  },
})

// 监听语言变化，保存到 localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18n-language', lng)
})

export default i18n

