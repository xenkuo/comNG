const locale = require('./locale.js').getLocale()

const shortcutsData = {
  zh: {
    fileops: [
      { action: '打开文件', shortcut: 'Cmd/Ctrl + O' },
      { action: '打开二进制文件', shortcut: 'Cmd/Ctrl + B' },
      { action: '保存文件', shortcut: 'Cmd/Ctrl + S' },
      { action: '另存为文件', shortcut: 'Cmd/Ctrl + Shift + S' },
      { action: '命令面板', shortcut: 'F1' },
      { action: '高亮切换', shortcut: 'Cmd/Ctrl + H' },
    ],
    general: [
      { action: '切换串口', shortcut: 'Cmd/Ctrl + D' },
      { action: '清空数据', shortcut: 'Cmd/Ctrl + X' },
      { action: '切换串口并清空', shortcut: 'Cmd/Ctrl + Shift + D' },
      { action: '新建标签', shortcut: 'Cmd/Ctrl + T' },
      { action: '切换到标签 1-5', shortcut: 'Alt + 1..5' },
    ],
  },
  en: {
    fileops: [
      { action: 'Open File', shortcut: 'Cmd/Ctrl + O' },
      { action: 'Open Binary File', shortcut: 'Cmd/Ctrl + B' },
      { action: 'Save File', shortcut: 'Cmd/Ctrl + S' },
      { action: 'Save as File', shortcut: 'Cmd/Ctrl + Shift + S' },
      { action: 'Command Palette', shortcut: 'F1' },
      { action: 'Toggle Highlight', shortcut: 'Cmd/Ctrl + H' },
    ],
    general: [
      { action: 'Switch Port', shortcut: 'Cmd/Ctrl + D' },
      { action: 'Clear Log', shortcut: 'Cmd/Ctrl + X' },
      { action: 'Switch Port&Clear Log', shortcut: 'Cmd/Ctrl + Shift + D' },
      { action: 'New Tab', shortcut: 'Cmd/Ctrl + T' },
      { action: 'Switch to Tab 1..5', shortcut: 'Alt + 1..5' },
    ],
  },
}

module.exports = {
  getShortcutsData() {
    return shortcutsData[locale] || shortcutsData.en
  },
}
