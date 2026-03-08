const locale = require('./locale.js').getLocale()
console.log('Locale:', locale)

const titleI18n = {
  zh: {
    setting: '设置',
    portSwitch: '串口开关',
    cleanData: '清空数据',
    autoScrolldown: '自动下拉',
    minimize: '最小化',
    maximize: '最大化',
    close: '关闭',
  },
  en: {
    setting: 'Settings',
    portSwitch: 'Port Switch',
    cleanData: 'Clean Data',
    autoScrolldown: 'Auto Scrolldown',
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
    darkTheme: '深色主题',
    customizedBaudRate: '自定义波特率',
    fontSize: '字体大小',
    fontFamily: '字体',
    protocolOptions: '协议配置',
    eof: '换行符',
    txHexMode: '十六进制',

    autoRepeat: '自动重发',
    signature: '签名',
    breakpoint: '文本断点',
    barColor: '控制板配色',
    darkThemeBarColor: '深色主题配色',
    lightThemeBarColor: '浅色主题配色',
    capture2File: '数据捕获到文件',
    shortcuts: '快捷键',
    chartSwitch: '启用可视化',
    chartExample: '消息示例：NGF Number0 Number1 Number2\\n',
    version: '版本',
    license: '许可证',
    starMe: '给我点个星',
    feedback: '反馈',
    documents: '文档',
    userManual: '用户手册',
    tryPreviewVersion: '尝鲜版本',
    toastEnableHexMode: '请先在通用标签页中启用"十六进制模式"。',
    toastBreakpointNotEmpty: '错误：文本断点不能为空',
    toastNoPortOpened: '错误：没有打开串口，无法写入',
    toastWriteFailed: '错误：写入失败，请重试',
    toastInvalidHexData: '错误：请确保发送的数据是有效的十六进制数据',
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
    darkTheme: 'Dark Theme',
    customizedBaudRate: 'Customized Baud Rate',
    fontSize: 'Font Size',
    fontFamily: 'Font Family',
    protocolOptions: 'Protocol Options',
    eof: 'EOF',
    txHexMode: 'Hex Mode',

    autoRepeat: 'Auto Repeat',
    signature: 'Signature',
    breakpoint: 'Break on Text',
    barColor: 'Bar Color',
    darkThemeBarColor: 'Dark Theme Bar Color',
    lightThemeBarColor: 'Light Theme Bar Color',
    capture2File: 'Capture to File',
    shortcuts: 'Shortcuts',
    chartSwitch: 'Enable Chart',
    chartExample: 'Message Example: NGF Number0 Number1 Number2\\n',
    version: 'Version',
    license: 'License',
    starMe: 'Star Me',
    feedback: 'Feedback',
    documents: 'Documents',
    userManual: 'User Manual',
    tryPreviewVersion: 'Try Preview Version',
    toastEnableHexMode: "Please first enable 'Hex Mode' in General tab.",
    toastBreakpointNotEmpty: 'Error: Breakpoint on-text can not be empty',
    toastNoPortOpened: 'Error: No port opened, cannot write',
    toastWriteFailed: 'Error: Write failed, please try again',
    toastInvalidHexData: 'Error: Please ensure the tx data is valid hex data',
  },
}

function applyLanguage() {
  let lang = locale.split('-')[0]
  if (!titleI18n[lang]) lang = 'en'
  // lang = 'zh' // for test

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
  getToastMessage,
}

/**
 * Get translated toast message
 * @param {string} key - The translation key
 * @returns {string} Translated message or fallback to English/key
 */
function getToastMessage(key) {
  const lang = locale.split('-')[0]
  const messages = labelI18n[lang] || labelI18n.en
  return messages[key] || labelI18n.en[key] || key
}
