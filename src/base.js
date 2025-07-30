/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { remote, shell, ipcRenderer, clipboard } = require('electron')
const appVersion = remote.app.getVersion()
const appUpdaterUrl =
  'https://gitee.com/api/v5/repos/xenkuo/comNG/releases/latest'
const mcss = require('materialize-css')
const ChromeTabs = require('chrome-tabs')
const { init } = require('./modules/store.js')
const store = remote.getGlobal('store')
const initMenuHandle = require('./menu-handle.js').initMenuHandle
initMenuHandle()

mcss.AutoInit()
var chromeTabs = new ChromeTabs()

var barHeight
var menuHeight
var textDownward = true
var ctrlKeyPressed = false

ipcRenderer.on('main-cmd', (event, arg) => {
  console.log(arg)
  switch (arg) {
    case 'ClearLog':
      clipboard.writeText(editor.getModel().getValue())
      document.getElementById('clear-btn').click()
      break
    case 'SwitchPort':
      document.getElementById('port-switch').click()
      break
    case 'ClearLog&SwitchPort': {
      let portSwitch = document.getElementById('port-switch')
      portSwitch.click()
      if (true == portSwitch.checked) {
        clipboard.writeText(editor.getModel().getValue())
        document.getElementById('clear-btn').click()
      }
      break
    }
    case 'OpenFile':
      openFile()
      break
    case 'OpenFileInNewTab':
      openFileInNewTab()
      break
    case 'OpenBinFile':
      openBinFile()
      break
    case 'SaveFile':
      saveFile()
      break
    case 'SaveAsFile':
      saveAsFile()
      break
    case 'NewTab':
      newTab()
      break
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
      switchTab(arg)
      break
    default:
      console.log('Unknown commands')
      break
  }
})

var iconWidth
var tabsOffset
var tabStdWidth
var dragMinWidth

function navigator_layout_update() {
  const windowWidth = window.innerWidth
  const logoEl = document.getElementById('logo')
  const logoWidth = parseInt(logoEl.style.width) | logoEl.offsetWidth
  const tabsAreaEl = document.getElementById('tabs-area')
  const tabAddBtnEl = document.getElementById('tab-add-btn')
  const dragAreaEl = document.getElementById('drag-area')
  const tabsMaxWidth = windowWidth - dragMinWidth - logoWidth - tabsOffset

  let tabsAreaWidth = parseInt(tabsAreaEl.style.width) | tabsAreaEl.offsetWidth
  const els = document.getElementsByClassName('chrome-tab')
  tabsAreaWidth = els.length * tabStdWidth
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
  document.getElementById('menu-area').hidden = store.get('menu.hidden')

  // 0: update elements size and position
  const cStyle = getComputedStyle(document.documentElement)

  // 1: update css variable
  iconWidth = parseInt(cStyle.getPropertyValue('--icon-width'))
  logoLeft = parseInt(cStyle.getPropertyValue('--logo-left'))
  tabsOffset = iconWidth + logoLeft
  tabStdWidth = parseInt(cStyle.getPropertyValue('--tab-std-width'))
  dragMinWidth = parseInt(cStyle.getPropertyValue('--drag-min-width'))
  barHeight = parseInt(cStyle.getPropertyValue('--bar-height'))
  menuHeight = parseInt(cStyle.getPropertyValue('--menu-height'))

  // 2: update editor height
  let nav = document.getElementById('nav-area')
  let bar = document.getElementById('bar-area')
  let menu = document.getElementById('menu-area')
  let editor = document.getElementById('editor-area')

  editor.style.height =
    window.innerHeight -
    nav.offsetHeight -
    bar.offsetHeight -
    menu.offsetHeight +
    'px'

  mcss.Tabs.getInstance(document.getElementById('menu-tabs')).select(
    store.get('menu.tab')
  )

  let baudSelect = document.getElementById('baud-select')
  baudSelect.options[0].text = store.get('general.customized')
  baudSelect.selectedIndex = store.get('baudIndex')
  mcss.FormSelect.init(baudSelect)

  document.getElementById('hexmode-switch').checked =
    store.get('general.hexmode')

  document.getElementById('timestamp-switch').checked =
    store.get('general.timestamp')
  if (true === store.get('general.modemSignal.rts')) {
    let e = document.getElementById('rts-btn')
    e.classList.remove('grey')
  }
  if (true === store.get('general.modemSignal.dtr')) {
    let e = document.getElementById('dtr-btn')
    e.classList.remove('grey')
  }
  document.getElementById('modem-signal-switch').checked = store.get(
    'general.modemSignal.switch'
  )
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

  document.getElementById('editor-font-family').value =
    store.get('general.fontFamily')
  document.getElementById('editor-font-size').value =
    store.get('general.fontSize')

  document.getElementById('trans-hexmode-switch').checked =
    store.get('transmit.hexmode')
  document.getElementById('trans-clean-switch').checked =
    store.get('transmit.clean')
  let transEof = document.getElementById('trans-eof-select')
  let transEofIndex = 0
  if ('\n' === store.get('transmit.eof')) {
    transEofIndex = 1
  } else if ('\r' === store.get('transmit.eof')) {
    transEofIndex = 2
  }
  transEof.selectedIndex = transEofIndex
  mcss.FormSelect.init(transEof)

  document.getElementById('breakpoint-switch').checked = store.get(
    'advance.breakpoint.switch'
  )
  document.getElementById('breakpoint-on-text').value = store.get(
    'advance.breakpoint.onText'
  )
  document.getElementById('breakpoint-after-lines').value = store.get(
    'advance.breakpoint.afterLines'
  )

  document.getElementById('sign-switch').checked = store.get(
    'advance.sign.switch'
  )
  document.getElementById('sign-name').value = store.get('advance.sign.name')

  document.getElementById('capture-file-switch').checked = store.get(
    'fileops.capture.switch'
  )
  document.getElementById('capture-file-path').value = store.get(
    'fileops.capture.filePath'
  )
  if (true === store.get('fileops.capture.switch')) {
    captureFileStream = fs.createWriteStream(
      store.get('fileops.capture.filePath'),
      {
        flags: 'a',
      }
    )
  }

  document.getElementById('insider-preview').checked = store.get(
    'about.insiderPreview'
  )

  document.getElementById('bar-color-head').value = store.get(
    'advance.barColor.head'
  )
  document.getElementById('bar-color-middle').value = store.get(
    'advance.barColor.middle'
  )
  document.getElementById('bar-color-tail').value = store.get(
    'advance.barColor.tail'
  )

  document.documentElement.style.setProperty(
    '--bar-color-head',
    store.get('advance.barColor.head')
  )
  document.documentElement.style.setProperty(
    '--bar-color-middle',
    store.get('advance.barColor.middle')
  )
  document.documentElement.style.setProperty(
    '--bar-color-tail',
    store.get('advance.barColor.tail')
  )

  document.getElementById('app-version').innerHTML = appVersion
  console.log('comNG Version: ', appVersion)

  function platformUpdateCheck(assets) {
    const os = require('os')
    let platform = os.platform()
    let suffix = 'exe'

    if ('darwin' === platform) suffix = 'dmg'
    else if ('linux' === platform) suffix = 'deb'

    for (const asset of assets) {
      if (asset.name !== undefined && -1 !== asset.name.indexOf(suffix)) {
        return true
      }
    }

    return false
  }

  fetch(appUpdaterUrl)
    .then((data) => {
      return data.json()
    })
    .then((res) => {
      if (
        res.prerelease === true &&
        store.get('about.insiderPreview') === false
      )
        return

      let latest = res.tag_name.split('v')[1]
      if (latest > appVersion && true === platformUpdateCheck(res.assets)) {
        const dialogOpts = {
          type: 'info',
          buttons: ['Download Now', 'Later'],
          message: 'Version: ' + latest + ' released!',
          detail: res.body,
        }

        dialog.showMessageBox(dialogOpts).then((returnValue) => {
          if (returnValue.response === 0)
            shell.openExternal(res.author.html_url + '/comNG/releases')
        })
      }
    })
}

window.onresize = () => {
  store.set('window.width', window.innerWidth)
  store.set('window.height', window.innerHeight)

  let nav = document.getElementById('nav-area')
  let bar = document.getElementById('bar-area')
  let menu = document.getElementById('menu-area')
  let editor = document.getElementById('editor-area')

  editor.style.height =
    window.innerHeight -
    nav.offsetHeight -
    bar.offsetHeight -
    menu.offsetHeight +
    'px'

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
        setTimeout
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

// For drag region which nav-area is, the behavior is different between Mac and Windows/Debian:
// On Windows/Debian a drag region is taken as system title bar, and all event is captured by
// system, app can't get any click or mouse event. At the same time, double click event
// will resize app window by system, no need for app to implement manually.
// On Mac, however, a drag region has no much different with common html element except supporting drag action. App can
// capture most of events and window resize(maximum and restore) should be implemented
// by app.
// In short, below two listener, onmousedown and ondbclick is only needed on Mac.
// And there's a drawback as Windows/Debian has implemented such function internally that maximum
// button info is not synced with system maximum and restore.
document.getElementById('nav-area').onmousedown = () => {
  // prevent text select for double click action
  return false
}

document.getElementById('nav-area').ondblclick = () => {
  // only for Mac, see above comment
  win = remote.getCurrentWindow()

  if (win.isMaximized()) {
    win.restore()
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
    win.restore()
  } else {
    win.maximize()
  }
}

document.getElementById('close-btn').onclick = () => {
  window.close()
}

document.getElementById('menu-btn').onclick = () => {
  let menu = document.getElementById('menu-area')
  let editor = document.getElementById('editor-area')

  if (menu.hidden === true) {
    editor.style.height = editor.offsetHeight - menuHeight + 'px'
    menu.hidden = false

    store.set('menu.hidden', false)
  } else {
    editor.style.height = editor.offsetHeight + menuHeight + 'px'
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

  if (pos > range - barHeight || pos < range - barHeight - menuHeight) {
    let menu = document.getElementById('menu-area')
    let editor = document.getElementById('editor-area')

    if (menu.hidden === false) {
      editor.style.height = editor.offsetHeight + menuHeight + 'px'
      menu.hidden = true

      store.set('menu.hidden', true)
    }
  }
}

document.getElementById('menu-tabs').onclick = () => {
  let tabs = mcss.Tabs.getInstance(document.getElementById('menu-tabs'))

  store.set('menu.tab', tabs.$content[0].id)
}

document.getElementById('hexmode-switch').onclick = (e) => {
  store.set('general.hexmode', e.target.checked)
  editor.updateOptions({ readOnly: e.target.checked })
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

let transRepeatTimer = undefined
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

  if (checked === false && transRepeatTimer !== undefined)
    clearInterval(transRepeatTimer)
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

document.getElementById('star-me').onclick = (e) => {
  e.preventDefault()
  shell.openExternal(e.target.href)
}

document.getElementById('comnglang').onclick = (e) => {
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
var pathUpdated = false
document.getElementById('path-input').onmouseover = (e) => {
  if (true === pathUpdated) return
  pathUpdated = true
  portUpdate()
}
document.getElementById('path-input').onmouseleave = (e) => {
  pathUpdated = false
}

document.getElementById('downward-btn').onclick = (e) => {
  if (textDownward === true) {
    textDownward = false
    e.target.classList.add('grey')
  } else {
    textDownward = true
    e.target.classList.remove('grey')
  }
}
