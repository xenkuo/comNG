/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { remote, shell } = require('electron')

const mcss = require('materialize-css')
const { applyLanguage } = require('./modules/i18n.js')
// Lazy load update checker to improve startup performance
const store = require('./modules/store.js').init()
const { initDomUtilities } = require('./modules/dom-utilities.js')
const initMenuHandle = require('./modules/menu-handle.js').initMenuHandle
const shortcutsDataModule = require('./modules/shortcuts-data.js')
initMenuHandle()

let barHeight
const menuInfo = require('./modules/menu-handle.js').menuInfo
// let tabsInst = null
// let ctrlKeyPressed = false

let iconWidth
let tabsOffset
let tabStdWidth
let dragMinWidth

const { navi_layout_init, navi_layout_update } = require('./modules/utilities.js')

// Modular initialization functions
function initializeUILayout() {
  document.getElementById('menu-area').hidden = store.get('menu.hidden')
  applyLanguage()

  // Initialize layout dimensions
  const cStyle = getComputedStyle(document.documentElement)
  iconWidth = parseInt(cStyle.getPropertyValue('--icon-width'))
  let logoLeft = parseInt(cStyle.getPropertyValue('--nav-margin'))
  tabsOffset = iconWidth + logoLeft
  tabStdWidth = parseInt(cStyle.getPropertyValue('--tab-std-width'))
  dragMinWidth = parseInt(cStyle.getPropertyValue('--drag-min-width'))
  barHeight = parseInt(cStyle.getPropertyValue('--bar-height'))
  menuInfo.height = parseInt(cStyle.getPropertyValue('--menu-height'))

  navi_layout_init(tabsOffset, tabStdWidth, dragMinWidth)
}

function initializeModules() {
  // Initialize ChromeTabs early for immediate tab visibility
  const chromeTabsModule = require('./modules/chrome-tabs.js')
  chromeTabsModule.initChromeTabs()

  mcss.AutoInit()

  // Set initial editor height
  updateEditorHeight()

  mcss.Tabs.getInstance(document.getElementById('menu-tabs')).select(store.get('menu.tab'))
}

function updateEditorHeight() {
  let nav = document.getElementById('nav-area')
  let bar = document.getElementById('bar-area')
  let menu = document.getElementById('menu-area')
  let editorEl = document.getElementById('editor-area')

  editorEl.style.height =
    window.innerHeight - nav.offsetHeight - bar.offsetHeight - menu.offsetHeight + 'px'
}

window.onload = () => {
  // Execute initialization in logical order
  initializeUILayout()
  initializeModules()

  // Initialize form elements
  initializeFormElements()

  // Check for updates after everything else is initialized
  checkForApplicationUpdates()
}

function initializeFormElements() {
  let baudSelect = document.getElementById('baud-select')
  baudSelect.options[0].text = store.get('general.customized')
  baudSelect.selectedIndex = store.get('baudIndex')
  mcss.FormSelect.init(baudSelect)

  document.getElementById('hexmode-switch').checked = store.get('general.hexmode')

  // Initialize dark theme setting
  if (store.get('general.darkTheme')) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
  document.getElementById('dark-theme-switch').checked = store.get('general.darkTheme') || false

  document.getElementById('timestamp-switch').checked = store.get('general.timestamp')
  if (true === store.get('general.modemSignal.rts')) {
    let e = document.getElementById('rts-btn')
    e.classList.remove('grey')
  }
  if (true === store.get('general.modemSignal.dtr')) {
    let e = document.getElementById('dtr-btn')
    e.classList.remove('grey')
  }
  document.getElementById('modem-signal-switch').checked = store.get('general.modemSignal.switch')
  if (store.get('general.modemSignal.switch') === true) {
    document.getElementById('modem-signal-bar').hidden = false
  } else {
    document.getElementById('modem-signal-bar').hidden = true
  }
  document.getElementById('customized').value = store.get('general.customized')

  let databits = document.getElementById('databits-select')
  databits.selectedIndex = store.get('general.databitsIndex')
  mcss.FormSelect.init(databits)
  let parity = document.getElementById('parity-select')
  parity.selectedIndex = store.get('general.parityIndex')
  mcss.FormSelect.init(parity)
  let stopbits = document.getElementById('stopbits-select')
  stopbits.selectedIndex = store.get('general.stopbitsIndex')
  mcss.FormSelect.init(stopbits)
  let flowcontrol = document.getElementById('flowcontrol-select')
  flowcontrol.selectedIndex = store.get('general.flowcontrolIndex')
  mcss.FormSelect.init(flowcontrol)

  document.getElementById('editor-font-family').value = store.get('general.fontFamily')
  document.getElementById('editor-font-size').value = store.get('general.fontSize')

  document.getElementById('trans-hexmode-switch').checked = store.get('transmit.hexmode')
  let transEof = document.getElementById('trans-eof-select')
  let transEofIndex = 0
  if ('\n' === store.get('transmit.eof')) {
    transEofIndex = 1
  } else if ('\r' === store.get('transmit.eof')) {
    transEofIndex = 2
  } else if ('\r\n' === store.get('transmit.eof')) {
    transEofIndex = 3
  }
  transEof.selectedIndex = transEofIndex
  mcss.FormSelect.init(transEof)

  document.getElementById('breakpoint-switch').checked = store.get('advance.breakpoint.switch')
  document.getElementById('breakpoint-on-text').value = store.get('advance.breakpoint.onText')
  document.getElementById('breakpoint-after-lines').value = store.get(
    'advance.breakpoint.afterLines'
  )

  document.getElementById('sign-switch').checked = store.get('advance.sign.switch')
  document.getElementById('sign-name').value = store.get('advance.sign.name')

  document.getElementById('insider-preview').checked = store.get('about.insiderPreview')

  document.getElementById('bar-color-head').value = store.get('advance.barColor.head')
  document.getElementById('bar-color-middle').value = store.get('advance.barColor.middle')
  document.getElementById('bar-color-tail').value = store.get('advance.barColor.tail')

  document.documentElement.style.setProperty('--bar-color-head', store.get('advance.barColor.head'))
  document.documentElement.style.setProperty(
    '--bar-color-middle',
    store.get('advance.barColor.middle')
  )
  document.documentElement.style.setProperty('--bar-color-tail', store.get('advance.barColor.tail'))

  initDomUtilities()
}

function createTxTable() {
  // Import and use the serialtx module
  const { createTxTable: createTable } = require('./modules/serialtx.js');
  return createTable();
}

createTxTable()
function checkForApplicationUpdates() {
  // Defer update checking to improve startup performance
  setTimeout(() => {
    try {
      const { checkForUpdates } = require('./modules/update.js')
      if (Math.random() < 0.3) { // 30% chance of checking
        checkForUpdates()
      }
    } catch (error) {
      console.warn('Update check skipped due to error:', error)
    }
  }, 3000) // Delay 3 seconds
}

window.onresize = () => {
  store.set('window.width', window.innerWidth)
  store.set('window.height', window.innerHeight)

  let nav = document.getElementById('nav-area')
  let bar = document.getElementById('bar-area')
  let menu = document.getElementById('menu-area')
  let editorEl = document.getElementById('editor-area')
  editorEl.style.height =
    window.innerHeight - nav.offsetHeight - bar.offsetHeight - menu.offsetHeight + 'px'

  navi_layout_update()
}

// For drag region which drag-area is, the behavior is different between Mac and Windows/Debian:
// On Windows/Debian a drag region is taken as system title bar, and all event is captured by
// system, app can't get any click or mouse event. At the same time, double click event
// will resize app window by system, no need for app to implement manually.
// On Mac, however, a drag region has no much different with common html element except supporting drag action. App can
// capture most of events and window resize(maximum and restore) should be implemented
// by app.
// In short, below two listener, onmousedown and ondbclick is only needed on Mac.
// And there's a drawback as Windows/Debian has implemented such function internally that maximum
// button info is not synced with system maximum and restore.
document.getElementById('drag-area').onmousedown = () => {
  // prevent text select for double click action
  return false
}

document.getElementById('drag-area').ondblclick = () => {
  // only for Mac, see above comment
  let win = remote.getCurrentWindow()

  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
}

document.getElementById('logo').onclick = () => {
  shell.openExternal('https://gitee.com/xenkuo/comNG')
}

document.getElementById('min-btn').onclick = () => {
  remote.getCurrentWindow().minimize()
}

document.getElementById('max-btn').onclick = () => {
  win = remote.getCurrentWindow()

  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
}

document.getElementById('close-btn').onclick = () => {
  window.close()
}

document.getElementById('menu-btn').onclick = () => {
  let menu = document.getElementById('menu-area')
  let editorEl = document.getElementById('editor-area')

  if (menu.hidden === true) {
    editorEl.style.height = editorEl.offsetHeight - menuInfo.height + 'px'
    menu.hidden = false

    store.set('menu.hidden', false)
  } else {
    editorEl.style.height = editorEl.offsetHeight + menuInfo.height + 'px'
    menu.hidden = true

    store.set('menu.hidden', true)
  }
}

document.body.onclick = (e) => {
  // don't process fake click
  if (e.isTrusted === false) return
  // don't process when click on menu-btn
  if (e.target.parentNode.id === 'menu-btn') return
  // don't process when we are in Transmit tab/Graphic tab
  if (document.getElementById('menu-tabs').M_Tabs.index === 1) return
  if (document.getElementById('menu-tabs').M_Tabs.index === 4) return

  let pos = e.clientY
  let range = document.body.offsetHeight

  if (pos > range - barHeight || pos < range - barHeight - menuInfo.height) {
    let menu = document.getElementById('menu-area')
    let editorEl = document.getElementById('editor-area')

    if (menu.hidden === false) {
      editorEl.style.height = editorEl.offsetHeight + menuInfo.height + 'px'
      menu.hidden = true

      store.set('menu.hidden', true)
    }
  }
}

document.getElementById('menu-tabs').onclick = (e) => {
  if (e.target.hash === '#chart-tab') {
    // don't store chart tab index to prevent error chart rendering
    setTimeout(() => {
      const event = new CustomEvent('chartTabActivated')
      el = document.getElementById('chart-figure')
      el.dispatchEvent(event)
    }, 100)
  } else {
    store.set('menu.tab', e.target.hash.replace('#', ''))
  }
}

document.getElementById('hexmode-switch').onclick = (e) => {
  store.set('general.hexmode', e.target.checked)

  // Sync to transmit hexmode switch
  document.getElementById('trans-hexmode-switch').checked = e.target.checked
  store.set('transmit.hexmode', e.target.checked)
}

document.getElementById('dark-theme-switch').onclick = (e) => {
  const isDark = e.target.checked

  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }

  store.set('general.darkTheme', isDark)

  // Update Chrome tabs theme
  try {
    const { updateChromeTabsTheme } = require('./modules/chrome-tabs.js')
    if (typeof updateChromeTabsTheme === 'function') {
      updateChromeTabsTheme(isDark)
    }
  } catch (error) {
    console.warn('Failed to update chrome-tabs theme:', error)
  }

  // Update Monaco editor theme
  try {
    const monaco = require('./modules/monaco-esm.js').monaco
    const { updateEditorTheme } = require('./modules/monaco-utilities.js')
    if (monaco && typeof updateEditorTheme === 'function') {
      // Get the active editor instance from chromeTabs
      const chromeTabsModule = require('./modules/chrome-tabs.js')
      const view = chromeTabsModule.tabsMap.get(chromeTabsModule.chromeTabs.activeTabEl)
      if (view && view.editor) {
        updateEditorTheme(view.editor, monaco, store)
      }
    }
  } catch (error) {
    console.warn('Failed to update editor theme:', error)
  }
  
  // Update Grid.js table theme (Transmit tab)
  try {
    const { updateTxTableTheme } = require('./modules/serialtx.js')
    if (typeof updateTxTableTheme === 'function') {
      updateTxTableTheme()
    }
  } catch (error) {
    console.warn('Failed to update Grid.js table theme:', error)
  }
}

document.getElementById('timestamp-switch').onclick = (e) => {
  store.set('general.timestamp', e.target.checked)
}

document.getElementById('modem-signal-switch').onclick = (e) => {
  let state = e.target.checked

  store.set('general.modemSignal.switch', state)
  if (state === true) {
    document.getElementById('modem-signal-bar').hidden = false
  } else {
    document.getElementById('modem-signal-bar').hidden = true
  }
}

document.getElementById('customized').onblur = (e) => {
  let customized = parseInt(e.target.value)

  if (isNaN(customized) === true) customized = 4800
  store.set('general.customized', customized)

  let baudSelect = document.getElementById('baud-select')

  baudSelect.options[0].text = customized
  mcss.FormSelect.init(baudSelect)
}

document.getElementById('databits-select').onchange = (e) => {
  store.set('general.databitsIndex', e.target.selectedIndex)
}

document.getElementById('parity-select').onchange = (e) => {
  store.set('general.parityIndex', e.target.selectedIndex)
}

document.getElementById('stopbits-select').onchange = (e) => {
  store.set('general.stopbitsIndex', e.target.selectedIndex)
}

document.getElementById('flowcontrol-select').onchange = (e) => {
  store.set('general.flowcontrolIndex', e.target.selectedIndex)
}

document.getElementById('sign-switch').onclick = (e) => {
  store.set('advance.sign.switch', e.target.checked)
}

document.getElementById('sign-name').onblur = (e) => {
  store.set('advance.sign.name', e.target.value)
}

document.getElementById('trans-eof-select').onchange = (e) => {
  let index = e.target.selectedIndex
  let eof = ''
  switch (index) {
    case 0:
      eof = ''
      break
    case 1:
      eof = '\n'
      break
    case 2:
      eof = '\r'
      break
    case 3:
      eof = '\r\n'
      break
    default:
      break
  }

  store.set('transmit.eof', eof)
}

document.getElementById('trans-hexmode-switch').onchange = (e) => {
  let checked = e.target.checked

  store.set('transmit.hexmode', checked)

  // Sync to general hexmode switch
  document.getElementById('hexmode-switch').checked = checked
  store.set('general.hexmode', checked)
}

document.getElementById('insider-preview').onclick = (e) => {
  store.set('about.insiderPreview', e.target.checked)
}

document.getElementById('bar-color-head').oninput = (e) => {
  let color = e.target.value

  document.documentElement.style.setProperty('--bar-color-head', color)
  store.set('advance.barColor.head', color)
}

document.getElementById('bar-color-middle').oninput = (e) => {
  let color = e.target.value

  document.documentElement.style.setProperty('--bar-color-middle', color)
  store.set('advance.barColor.middle', color)
}

document.getElementById('bar-color-tail').oninput = (e) => {
  let color = e.target.value

  document.documentElement.style.setProperty('--bar-color-tail', color)
  store.set('advance.barColor.tail', color)
}

document.getElementById('issue').onclick = (e) => {
  e.preventDefault()
  shell.openExternal(e.target.href)
}

document.getElementById('gitee-star').onclick = (e) => {
  e.preventDefault()
  shell.openExternal(e.target.href)
}

document.getElementById('github-star').onclick = (e) => {
  e.preventDefault()
  shell.openExternal(e.target.href)
}

document.getElementById('documents').onclick = (e) => {
  e.preventDefault()
  shell.openExternal(e.target.href)
}

// Load shortcuts data dynamically
function loadShortcutsData() {
  const shortcuts = shortcutsDataModule.getShortcutsData()

  // Load fileops shortcuts
  const fileopsTable = document.querySelector('#shortcuts-fileops-table tbody')
  if (fileopsTable && shortcuts.fileops) {
    fileopsTable.innerHTML = shortcuts.fileops.map(item =>
      `<tr><td>${item.action}</td><td>${item.shortcut}</td></tr>`
    ).join('')
  }

  // Load general shortcuts
  const generalTable = document.querySelector('#shortcuts-general-table tbody')
  if (generalTable && shortcuts.general) {
    generalTable.innerHTML = shortcuts.general.map(item =>
      `<tr><td>${item.action}</td><td>${item.shortcut}</td></tr>`
    ).join('')
  }
}

// Load shortcuts after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadShortcutsData)
} else {
  loadShortcutsData()
}




