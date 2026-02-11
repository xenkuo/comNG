/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { ipcRenderer, clipboard } = require('electron')
const chromeTabsModule = require('./chrome-tabs.js')

/**
 * Initialize IPC command handlers
 */
function initIPCHandlers() {
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
      _handleOpenFile()
      break
    case 'OpenFileInNewTab':
      _handleOpenFileInNewTab()
      break
    case 'OpenBinFile':
      _handleOpenBinFile()
      break
    case 'SaveFile':
      _handleSaveFile()
      break
    case 'SaveAsFile':
      _handleSaveAsFile()
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
  clipboard.writeText(window.editorInst.getModel().getValue())
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
    clipboard.writeText(window.editorInst.getModel().getValue())
    document.getElementById('data-cleanup-btn').click()
  }
}

/**
 * Handle OpenFile command
 */
function _handleOpenFile() {
  window.openFile()
}

/**
 * Handle OpenFileInNewTab command
 */
function _handleOpenFileInNewTab() {
  window.openFileInNewTab()
}

/**
 * Handle OpenBinFile command
 */
function _handleOpenBinFile() {
  window.hexMode.openBinFile(
    window.editorInst, 
    window.chromeTabs, 
    window.tabsMap, 
    window.watcher, 
    window.monacox
  )
}

/**
 * Handle SaveFile command
 */
function _handleSaveFile() {
  window.saveFile()
}

/**
 * Handle SaveAsFile command
 */
function _handleSaveAsFile() {
  window.saveAsFile()
}

// Export functions
module.exports = {
  initIPCHandlers
}
