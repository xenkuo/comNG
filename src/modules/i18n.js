const { remote } = require('electron')

const locale = remote.app.getLocale()
console.log('Locale:', locale)

const titleI18n = {
  zh: {
    setting: '设置',
    portSwitch: '串口开关',
    cleanData: '清空数据',
    autoRefresh: '自动刷新',
  },
  en: {
    setting: 'Settings',
    portSwitch: 'Port Switch',
    cleanData: 'Clean Data',
    autoRefresh: 'Auto Refresh',
  },
}

function applyLanguage() {
  // 如果语言不存在，默认英文
  let lang = locale.split('-')[0]
  if (!titleI18n[lang]) lang = 'en'
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title')
    el.title = titleI18n[lang][key] || key
  })
}

module.exports = {
  applyLanguage,
}
