const { remote } = require('electron')

const locale = remote.app.getLocale()
console.log('Locale:', locale)

const titleI18n = {
  zh: {
    setting: '设置',
    portSwitch: '串口开关',
    cleanData: '清空数据',
    autoRefresh: '自动刷新',
    minimize: '最小化',
    maximize: '最大化',
    close: '关闭',
  },
  en: {
    setting: 'Settings',
    portSwitch: 'Port Switch',
    cleanData: 'Clean Data',
    autoRefresh: 'Auto Refresh',
    minimize: 'Minimize',
    maximize: 'Maximize',
    close: 'Close',
  },
}

const labelI18n = {
  zh: {
    general: '通用',
    transmit: '发送',
    advance: '高级',
    fileops: '文件操作',
    chart: '可视化',
    about: '关于',
    hexMode: '十六进制模式',
    timestamp: '时间戳',
    modemSignal: '流控信号',
    customizedBaudRate: '自定义波特率',
    fontSize: '字体大小',
    fontFamily: '字体',
    protocolOptions: '通信配置',
  },
  en: {
    general: 'General',
    transmit: 'Transmit',
    advance: 'Advance',
    fileops: 'File Ops',
    chart: 'Chart',
    about: 'About',
    hexMode: 'Hex Mode',
    timestamp: 'Timestamp',
    modemSignal: 'Modem Signal',
    customizedBaudRate: 'Customized Baud Rate',
    fontSize: 'Font Size',
    fontFamily: 'Font Family',
    protocolOptions: 'Protocol Options',
  },
}

function applyLanguage() {
  // 如果语言不存在，默认英文
  let lang = locale.split('-')[0]
  if (!titleI18n[lang]) lang = 'en'

  document.querySelectorAll('[i18n-title]').forEach((el) => {
    const key = el.getAttribute('i18n-title')
    el.title = titleI18n[lang][key] || key
  })

  document.querySelectorAll('[i18n-label]').forEach((el) => {
    const key = el.getAttribute('i18n-label')
    el.textContent = labelI18n[lang][key] || key
  })
}

module.exports = {
  applyLanguage,
}
