/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { remote, shell } = require('electron')

const mcss = require('materialize-css')
const { init } = require('./modules/store.js')
const { memoryUsage } = require('process')
const { applyLanguage } = require('./modules/i18n.js')
const checkForUpdates = require('./modules/update.js').checkForUpdates
const hexModeB = require('./modules/hex-mode.js')
const chromeTabsModuleB = require('./modules/chrome-tabs.js')
const ipcHandler = require('./modules/ipc-handler.js')
const store = remote.getGlobal('store')
const initMenuHandle = require('./modules/menu-handle.js').initMenuHandle
initMenuHandle()

let barHeight
const menuInfo = require('./modules/menu-handle.js').menuInfo
let tabsInst = null
let ctrlKeyPressed = false

// Make hexModeB globally accessible for IPC handler
window.hexModeB = hexModeB

// Initialize IPC handlers
ipcHandler.initIPCHandlers()

let iconWidth
let tabsOffset
let tabStdWidth
let dragMinWidth

function navigator_layout_update() {
  const windowWidth = window.innerWidth
  const logoEl = document.getElementById('logo')
  const logoWidth = parseInt(logoEl.style.width) | logoEl.offsetWidth
  const tabsAreaEl = document.getElementById('tabs-area')
  const tabAddBtnEl = document.getElementById('tab-add-btn')
  const dragAreaEl = document.getElementById('drag-area')
  const tabsMaxWidth = windowWidth - dragMinWidth - logoWidth - tabsOffset

  const els = document.getElementsByClassName('chrome-tab')
  let tabsAreaWidth = els.length * tabStdWidth
  if (tabsAreaWidth > tabsMaxWidth) tabsAreaWidth = tabsMaxWidth

  tabsAreaEl.style.width = tabsAreaWidth + 'px'
  tabAddBtnEl.style.left = tabsOffset + tabsAreaWidth + 'px'
  dragAreaEl.style.width =
    windowWidth -
    tabsAreaWidth -
    tabsOffset -
    (parseInt(tabAddBtnEl.style.width) | tabAddBtnEl.offsetWidth) +
    'px'
}

window.onload = () => {
  mcss.AutoInit()
  tabsInst = mcss.Tabs.getInstance(document.getElementById('menu-tabs'))
  document.getElementById('menu-area').hidden = store.get('menu.hidden')

  applyLanguage()
  // 0: update elements size and position
  const cStyle = getComputedStyle(document.documentElement)

  // 1: update css variable
  iconWidth = parseInt(cStyle.getPropertyValue('--icon-width'))
  let logoLeft = parseInt(cStyle.getPropertyValue('--nav-margin'))
  tabsOffset = iconWidth + logoLeft
  tabStdWidth = parseInt(cStyle.getPropertyValue('--tab-std-width'))
  dragMinWidth = parseInt(cStyle.getPropertyValue('--drag-min-width'))
  barHeight = parseInt(cStyle.getPropertyValue('--bar-height'))
  menuInfo.height = parseInt(cStyle.getPropertyValue('--menu-height'))

  // 2: update editor height
  let nav = document.getElementById('nav-area')
  let bar = document.getElementById('bar-area')
  let menu = document.getElementById('menu-area')
  let editorEl = document.getElementById('editor-area')

  editorEl.style.height =
    window.innerHeight - nav.offsetHeight - bar.offsetHeight - menu.offsetHeight + 'px'

  mcss.Tabs.getInstance(document.getElementById('menu-tabs')).select(store.get('menu.tab'))

  let baudSelect = document.getElementById('baud-select')
  baudSelect.options[0].text = store.get('general.customized')
  baudSelect.selectedIndex = store.get('baudIndex')
  mcss.FormSelect.init(baudSelect)

  document.getElementById('hexmode-switch').checked = store.get('general.hexmode')

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
  document.getElementById('trans-clean-switch').checked = store.get('transmit.clean')
  let transEof = document.getElementById('trans-eof-select')
  let transEofIndex = 0
  if ('\n' === store.get('transmit.eof')) {
    transEofIndex = 1
  } else if ('\r' === store.get('transmit.eof')) {
    transEofIndex = 2
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

  document.getElementById('capture-file-switch').checked = store.get('fileops.capture.switch')
  document.getElementById('capture-file-path').value = store.get('fileops.capture.filePath')
  if (true === store.get('fileops.capture.switch')) {
    let captureFileStream = fs.createWriteStream(store.get('fileops.capture.filePath'), {
      flags: 'a',
    })
  }

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

  checkForUpdates()
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

  navigator_layout_update()
}

document.onkeydown = function (e) {
  e = e || window.event
  // console.log(e.which, e.keyCode);

  switch (e.which || e.keyCode) {
    case 13: // the enter key
      if (document.activeElement.id === 'trans-data') {
        document.getElementById('trans-send-btn').click()
      }
      break
    case 9: // the tab key
      if (document.activeElement.id === 'trans-data') {
        if (e.preventDefault) e.preventDefault()
        const transDataEl = document.getElementById('trans-data')
        serialWrite(transDataEl.value + '\t')
        transDataEl.value = ''
      }
      break
    case 17:
      if (document.activeElement.id === 'trans-data') {
        ctrlKeyPressed = true
        setTimeout(() => {
          ctrlKeyPressed = false
        }, 1000)
      }
      break
    case 67:
      if (document.activeElement.id === 'trans-data') {
        if (true === ctrlKeyPressed) {
          ctrlKeyPressed = false
          serialWrite([3]) // send ctrl+c
        }
      }
      break
    default:
      break
  }
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
  editorInst.updateOptions({ readOnly: e.target.checked })
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

let transRepeatTimer
document.getElementById('trans-send-btn').onclick = () => {
  const logObj = document.getElementById('trans-log-area')
  const dataObj = document.getElementById('trans-data')

  let dataIn = dataObj.value
  let dataOut = dataIn
  let eof = store.get('transmit.eof')
  if (true === store.get('transmit.hexmode')) {
    dataOut = Buffer.from(dataIn, 'hex')
  } else {
    dataOut += eof
  }

  if (serialWrite(dataOut) === false) return

  logObj.value += '\n' + dataIn
  mcss.updateTextFields(logObj)
  mcss.textareaAutoResize(logObj)
  logObj.scrollTop = logObj.scrollHeight

  if (document.getElementById('trans-repeat-switch').checked === true) {
    if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer)

    let interval = document.getElementById('trans-repeat-interval').value
    interval = parseInt(interval)
    if (isNaN(interval) === true) interval = 1000

    transRepeatTimer = setInterval(() => {
      serialWrite(dataOut)
    }, interval)
  }

  // clear data element
  if (true === store.get('transmit.clean')) dataObj.value = ''
}

document.getElementById('trans-eof-select').onchange = (e) => {
  let index = e.target.selectedIndex
  let eof = '\r\n'
  switch (index) {
    case 1:
      eof = '\n'
      break
    case 2:
      eof = '\r'
      break
    default:
      break
  }

  store.set('transmit.eof', eof)
}

document.getElementById('trans-hexmode-switch').onchange = (e) => {
  let checked = e.target.checked

  store.set('transmit.hexmode', checked)
}

document.getElementById('trans-clean-switch').onchange = (e) => {
  let checked = e.target.checked

  store.set('transmit.clean', checked)
}

document.getElementById('trans-repeat-switch').onchange = (e) => {
  let checked = e.target.checked

  if (checked === false && transRepeatTimer !== undefined) clearInterval(transRepeatTimer)
}

document.getElementById('trans-log-btn').onclick = () => {
  let logEl = document.getElementById('trans-log-area')

  logEl.value = ''
  mcss.updateTextFields(logEl)
  mcss.textareaAutoResize(logEl)
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

document.getElementById('baud-select').onchange = (e) => {
  let ele = e.target

  store.set('baudIndex', ele.selectedIndex)
  if (port === undefined || port.isOpen === false) return

  let baudRate = parseInt(ele.options[ele.selectedIndex].text)
  if (isNaN(baudRate) === true) baudRate = 115200
  port.update({ baudRate: baudRate }, (e) => {
    if (e !== null) console.error(e)
  })
}

document.getElementById('path-select').onchange = (e) => {
  store.set('pathIndex', e.target.selectedIndex)
  if (port === undefined || port.isOpen === false) return

  port.close()
  setTimeout(() => {
    document.getElementById('port-switch').click()
  }, 400)
}

// Automatically update port
let pathUpdated = false
document.getElementById('path-input').onmouseover = (e) => {
  if (true === pathUpdated) return
  pathUpdated = true
  portUpdate()
}
document.getElementById('path-input').onmouseleave = (e) => {
  pathUpdated = false
}
