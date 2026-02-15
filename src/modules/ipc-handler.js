/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { ipcRenderer } = require('electron')
const chromeTabsModule = require('./chrome-tabs.js')

let openFileHandler = null
let openBinFileHandler = null
let saveFileHandler = null
let saveAsFileHandler = null

/**
 * Initialize IPC command handlers
 */
function initIPCHandlers(handlers) {
  openFileHandler = handlers.openFileHandler
  openBinFileHandler = handlers.openBinFileHandler
  saveFileHandler = handlers.saveFileHandler
  saveAsFileHandler = handlers.saveAsFileHandler

  ipcRenderer.on('main-cmd', (event, arg) => {
    console.log(arg)
    handleCommand(arg)
  })
}

/**
 * Handle IPC commands from main process
 * @param {string} command - Command name
 */
function handleCommand(command) {
  switch (command) {
    case 'ClearLog':
      _handleClearLog()
      break
    case 'SwitchPort':
      _handleSwitchPort()
      break
    case 'ClearLog&SwitchPort':
      _handleClearLogAndSwitchPort()
      break
    case 'OpenFile':
      openFileHandler()
      break
    case 'OpenFileInNewTab':
      openFileHandler()
      break
    case 'OpenBinFile':
      openBinFileHandler()
      break
    case 'SaveFile':
      saveFileHandler()
      break
    case 'SaveAsFile':
      saveAsFileHandler()
      break
    case 'NewTab':
      chromeTabsModule.newTab()
      break
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
      chromeTabsModule.switchTab(parseInt(command))
      break
    default:
      console.log('Unknown commands')
      break
  }
}

/**
 * Handle ClearLog command
 */
function _handleClearLog() {
  document.getElementById('data-cleanup-btn').click()
}

/**
 * Handle SwitchPort command
 */
function _handleSwitchPort() {
  document.getElementById('port-switch').click()
}

/**
 * Handle ClearLog&SwitchPort command
 */
function _handleClearLogAndSwitchPort() {
  let portSwitch = document.getElementById('port-switch')
  portSwitch.click()
  if (portSwitch.checked) {
    document.getElementById('data-cleanup-btn').click()
  }
}

// Export functions
module.exports = {
  initIPCHandlers,
}
