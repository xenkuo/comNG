const { remote } = require('electron')

const locale = remote.app.getLocale()
console.log('Locale:', locale)

const translations = {
  zh: {
    setting: '设置',
  },
  en: {
    setting: 'Settings',
  },
}

function applyLanguage() {
  // 如果语言不存在，默认英文
  let lang = locale.split('-')[0]
  if (!translations[lang]) lang = 'en'
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title')
    el.title = translations[lang][key] || key
  })
}

module.exports = {
  applyLanguage,
}
