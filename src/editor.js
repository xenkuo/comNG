/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const path = require('path')
const initMonaco = require('./modules/monaco.js').initMonaco
const monacoUtilities = require('./modules/monaco-utilities.js')
const hlt = require('./modules/highlight.js')
const hexMode = require('./modules/hex-mode.js')
const chromeTabsModule = require('./modules/chrome-tabs.js')

const fs = require('fs')
const { dialog } = require('electron').remote
const languageDetect = require('language-detect')
const chokidar = require('chokidar')
// ChromeTabs functionality moved to chrome-tabs module

// Hex mode constants imported from hex-mode module
let monacox = null
let editorInst
let breakpointHit = false
let breakpointAfterLines = 0
let breakpointBuff = []
let chartFrameBuff = []
let half_line = false
let ansiWait = false
let captureFileStream
let localSave = false

// tabsMap functionality moved to chrome-tabs module

// -----------------------chokidar watch section
const watcher = chokidar.watch('./a.bc', {
  ignored: /(^|[/\\])\../, // ignore dotfiles
  persistent: true,
})
// Make watcher globally accessible
window.watcher = watcher

watcher.on('change', (filePath) => {
  // console.log(filePath + " content changed");
  if (true === localSave) {
    localSave = false
    return
  }
  tabsMap.forEach((view, el) => {
    if (filePath === view.path) {
      // Here we add a 100ms delay as external editor (or the watcher itself)
      // seems like first trigger the change event then will keep lock the file
      // for small amount time.
      // This will sometimes cause readFileSync or readFile return empty content and no
      // error watched.
      setTimeout(() => {
        view.model.setValue(fs.readFileSync(filePath, 'utf8'))
      }, 100)
    }
  })
})

watcher.on('unlink', (filePath) => {
  console.log(filePath + 'removed')
  tabsMap.forEach((view, el) => {
    if (filePath === view.path) {
      view.path = null
      el.children[2].children[1].style.color = '#f54336'
    }
  })
})

// ------------------------editor section

function openFile() {
  dialog
    .showOpenDialog({
      properties: ['openFile'],
    })
    .then((result) => {
      if (result.canceled === false) {
        const filePath = result.filePaths[0]
        // setup model theme and language
        const model = editorInst.getModel()
        const lang = languageDetect.filename(filePath)
        if (undefined !== lang && 'Text' !== lang) {
          monacox.editor.setModelLanguage(model, lang.toLowerCase())
        }

        // show text
        fs.readFile(filePath, 'utf8', (e, data) => {
          if (e) throw e
          editorInst.getModel().setValue(data)
        })

        // setup tab
        const title = path.basename(filePath)
        const el = chromeTabs.activeTabEl
        const view = tabsMap.get(el)

        // 1. setup file watcher
        if (null !== view.path) {
          watcher.unwatch(view.path)
        }
        watcher.add(filePath)
        // 2. setup tabsMap file path
        tabsMap.get(el).path = filePath
        // 3. setup title
        let titleEl = el.querySelector('.chrome-tab-title')

        // el.align = 'center'
        titleEl.innerHTML = title
      }
    })
}

// ----------------------editor function section
function openFileInNewTab() {
  chromeTabsModule.openFileInNewTab(openFile)
}

function saveFile() {
  const el = chromeTabs.activeTabEl
  const view = tabsMap.get(el)
  if (view.path !== null) {
    // has path info
    const text = editorInst.getModel().getValue()
    fs.writeFileSync(view.path, text)
    el.children[2].children[1].style.color = '#000000'

    // update localSave state
    localSave = true
  } else {
    // no path info
    const fileName = chromeTabs.activeTabEl.innerText

    dialog
      .showSaveDialog({
        properties: ['createDirectory'],
        defaultPath: fileName,
        filters: [{ extensions: ['log'] }],
      })
      .then((result) => {
        if (result.canceled === false) {
          // save to file
          const filePath = result.filePath
          const text = editorInst.getModel().getValue()
          fs.writeFileSync(filePath, text)
          // update tab's path
          view.path = filePath
          el.children[2].children[1].style.color = '#000000'
          // update tab title
          let titleEl = el.querySelector('.chrome-tab-title')
          titleEl.innerHTML = path.basename(filePath)
          // add to watcher
          watcher.add(filePath)
          // update localSave state
          localSave = true
          // update theme accord to new file extension
          const lang = languageDetect.filename(filePath)
          if (undefined !== lang && 'Text' !== lang) {
            monacox.editor.setModelLanguage(view.model, lang.toLowerCase())
          }
        }
      })
  }
}

function saveAsFile() {
  const el = chromeTabs.activeTabEl
  const view = tabsMap.get(el)
  // no path info
  const fileName = chromeTabs.activeTabEl.innerText

  dialog
    .showSaveDialog({
      properties: ['createDirectory'],
      defaultPath: fileName,
      filters: [{ extensions: ['log'] }],
    })
    .then((result) => {
      if (result.canceled === false) {
        // save to file
        const filePath = result.filePath
        const text = editorInst.getModel().getValue()
        fs.writeFileSync(filePath, text)
        // update tab's path
        view.path = filePath
        el.children[2].children[1].style.color = '#000000'
        // update tab title
        let titleEl = el.querySelector('.chrome-tab-title')
        titleEl.innerHTML = path.basename(filePath)
        // add to watcher
        watcher.add(filePath)
        // update localSave state
        localSave = true
        // update theme accord to new file extension
        const lang = languageDetect.filename(filePath)
        if (undefined !== lang && 'Text' !== lang) {
          monacox.editor.setModelLanguage(view.model, lang.toLowerCase())
        }
      }
    })
}

// Expose hexModeProcess globally for serialport.js to use
window.hexModeProcess = (buffer, revealLine) => {
  hexMode.hexModeProcess(buffer, revealLine, monacox, editorInst)
}

function _breakpointProcess(line) {
  if (breakpointHit === false) {
    let bpLine = line

    if (breakpointBuff.length !== 0) {
      bpLine = Buffer.concat([breakpointBuff, line], line.length + breakpointBuff.length)
      breakpointBuff = []
    }

    if (bpLine.includes(store.get('advance.breakpoint.onText')) === true) {
      breakpointHit = true
      breakpointAfterLines = 0
    }
  } else {
    breakpointAfterLines++
    if (breakpointAfterLines >= store.get('advance.breakpoint.afterLines')) {
      breakpointHit = false
      breakpointAfterLines = 0

      return true
    }
  }

  return false
}

function _filterAnsiCode(inBuffer) {
  let inArray = [...inBuffer]
  let outArray = []
  let arrayLen = inArray.length

  for (let i = 0; i < arrayLen; i++) {
    if (ansiWait === false) {
      if (0x1b !== inArray[i]) {
        // \u001b
        outArray.push(inArray[i])
      } else {
        ansiWait = true
      }
    } else if (0x6d === inArray[i]) {
      // m
      ansiWait = false
    }
  }

  return Buffer.from(outArray)
}

function stringModeProcess(inBuffer) {
  // 1. trim ansi escape codes
  // let buffer = _filterAnsiCode(inBuffer);
  let buffer = inBuffer

  // 2. output full line
  let index = -1
  let outputTmp
  while ((index = buffer.indexOf('\n')) !== -1) {
    let line = buffer.slice(0, index + 1)

    if (half_line === true) {
      outputTmp = line
      half_line = false
    } else {
      let timestamp = ''

      if (store.get('general.timestamp') === true) timestamp = monacoUtilities.getTimestamp()
      outputTmp = timestamp + line
    }
    monacoUtilities.applyEdit(
      monacox,
      editorInst,
      outputTmp.toString().replace(/[^\x20-\x7E\n\r\t]/g, '.'),
      true,
      true
    )

    buffer = buffer.slice(index + 1, buffer.length)

    if (store.get('advance.breakpoint.switch') === true) {
      if (_breakpointProcess(line) === true) {
        buffer = Buffer.from('')
        serialClose()
      }
    }
  }

  // 3. output partial line
  if (buffer.length !== 0) {
    if (half_line === true) {
      outputTmp = buffer
    } else {
      let timestamp = ''

      if (store.get('general.timestamp') === true) timestamp = monacoUtilities.getTimestamp()
      outputTmp = timestamp + buffer
      half_line = true
    }
    monacoUtilities.applyEdit(
      monacox,
      editorInst,
      outputTmp.toString().replace(/[^\x20-\x7E\n\r\t]/g, '.'),
      true,
      true
    )
  }
  if (store.get('advance.breakpoint.switch') === true) {
    breakpointBuff = buffer
  }
}

initMonaco()
window.addEventListener('monacoloaded', (e) => {
  monacox = e.detail.monaco
  // Make monacox globally accessible
  window.monacox = monacox

  monacox.languages.register({
    id: 'comNGLang',
  })
  monacox.languages.setMonarchTokensProvider('comNGLang', {
    defaultToken: '',

    tokenizer: {
      root: [
        [/^\[?[f|F][a|A][t|T][a|A][l|L]\]?\s.*/, 'fatal'],
        [/\s+\[?[f|F][a|A][t|T][a|A][l|L]\]?\s+/, 'fatal'],
        [/^\[?F\]?\s.*/, 'fatal'],
        [/\s+\[?F\]?\s+/, 'fatal'],
        [/^\[?[e|E][r|R][r|R][o|O][r|R]\]?\s.*/, 'error'],
        [/\s+\[?[e|E][r|R][r|R][o|O][r|R]\]?\s+/, 'error'],
        [/^\[?E\]?\s.*/, 'error'],
        [/\s+\[?E\]?\s+/, 'error'],
        [/^\[?[w|W][a|A][r|R][n|N]\]?\s.*/, 'warn'],
        [/\s+\[?[w|W][a|A][r|R][n|N]\]?\s+/, 'warn'],
        [/^\[?W\]?\s.*/, 'warn'],
        [/\s+\[?W\]?\s+/, 'warn'],
        [/^\[?[i|I][n|N][f|F][o|O]\]?\s.*/, 'info'],
        [/\s+\[?[i|I][n|N][f|F][o|O]\]?\s+/, 'info'],
        [/^\[?I\]?\s.*/, 'info'],
        [/\s+\[?I\]?\s+/, 'info'],
        [/^\[?[t|T][r|R][a|A][c|C][e|E]\]?\s.*/, 'trace'],
        [/\s+\[?[t|T][r|R][a|A][c|C][e|E]\]?\s+/, 'trace'],
        [/^\[?T\]?\s.*/, 'trace'],
        [/\s+\[?T\]?\s+/, 'trace'],
        [/^\[?[d|D][e|E][b|B][u|U][g|G]\]?\s.*/, 'debug'],
        [/\s+\[?[d|D][e|E][b|B][u|U][g|G]\]?\s+/, 'debug'],
        [/^\[?D\]?\s.*/, 'debug'],
        [/\s+\[?D\]?\s+/, 'debug'],

        [/\[\d;\d{2}m/, 'useless'],
        [/\[\dm/, 'useless'],

        [/[{}()[\]]/, 'bracket'],
        [/^\d{1,2}:\d{2}:\d{2}:\d{1,3}/, 'timestamp'],
        [/\d{1,4}[-/.:]\d{1,2}\1\d{1,4}/, 'time'],
        [/\d{1,4}[-/.:]\d{1,2}\1\d{1,4}/, 'time'],
        [/\b(?:\d{1,3}\.){3}\d{1,3}\b/, 'ip'],
        [/([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}|([0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}/, 'mac'],
        [/\d*\.\d+([eE][-+]?\d+)?/, 'number'],
        [/0[xX][0-9a-fA-F]+/, 'number'],
        [/[0-9a-fA-F]{4,}/, 'number'],
        [/\d+/, 'number'],
      ],
    },
  })

  // Define a new theme that contains only rules that match this language
  monacox.editor.defineTheme('comNGTheme', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'number', foreground: '2e7d32' },
      { token: 'bracket', foreground: 'ff9800' },
      { token: 'timestamp', foreground: 'f5984a' },
      { token: 'time', foreground: '2196f3' },
      { token: 'ip', foreground: '03a9f4' },
      { token: 'mac', foreground: '00bcd4' },
      { token: 'fatal', foreground: 'e91e63' },
      { token: 'error', foreground: 'f44336' },
      { token: 'warn', foreground: 'ff9800' },
      { token: 'info', foreground: '9e9e9e' },
      { token: 'trace', foreground: '9e9d24' },
      { token: 'debug', foreground: '2e7d32' },
      { token: 'useless', foreground: 'cecece' },
    ],
  })

  let readOnlyEditor = false
  if (true === store.get('general.hexmode')) {
    readOnlyEditor = true
  }
  editorInst = monacox.editor.create(document.getElementById('editor-area'), {
    model: null,
    theme: 'comNGTheme',
    language: 'comNGLang',
    automaticLayout: true,
    readOnly: readOnlyEditor,
    folding: false,
    fontFamily: store.get('general.fontFamily'),
    fontSize: store.get('general.fontSize'),
    overviewRulerBorder: false,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    mouseWheelZoom: true, // combined with Ctrl
    wordWrap: 'on',
    wordWrapBreakAfterCharacters: '',
    wordWrapBreakBeforeCharacters: '',
    lineNumbersMinChars: 5,
    // minimap: {
    //   enabled: false,
    // },
    scrollbar: {
      vertical: 'auto',
      useShadows: false,
      // verticalScrollbarSize: 10,
    },
  })
  // Make editorInst globally accessible
  window.editorInst = editorInst

  monacox.languages.setLanguageConfiguration('comNGLang', {
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['"', '"'],
      ["'", "'"],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  })

  editorInst.addAction({
    id: 'highlight-toggle',
    label: 'Highlight Toggle',
    keybindings: [monacox.KeyMod.CtrlCmd + monacox.KeyCode.KEY_E],
    precondition: null,
    keybindingContext: null,
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 3.5,
    run: hlt.toggle,
  })

  editorInst.addAction({
    id: 'highlight-clear-all',
    label: 'Highlight Clear All',
    keybindings: [monacox.KeyMod.CtrlCmd + monacox.KeyMod.Shift + monacox.KeyCode.KEY_E],
    precondition: null,
    keybindingContext: null,
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 3.6,
    run: hlt.clear,
  })

  editorInst.addCommand(monacox.KeyMod.CtrlCmd + monacox.KeyCode.KEY_W, () => {
    // Do nothing but prevent default action: close window
  })

  // editor.addCommand(monacox.KeyMod.CtrlCmd + monacox.KeyCode.KEY_X, () => {
  //   // Do nothing but prevent default action: close window
  // });

  // Hex mode functions are now in the hex-mode module

  // Initialize hex mode handlers
  hexMode.initHexModeHandlers(editorInst, monacox, hlt)

  // Initialize ChromeTabs module
  chromeTabsModule.initChromeTabs({
    monacox: monacox,
    editorInst: editorInst,
    watcher: watcher
  })
})

document.getElementById('data-cleanup-btn').onclick = () => {
  let value = ''

  if (store.get('advance.sign.switch') === true) {
    value = '------This file captured at ' + new Date().toLocaleString() + ' with comNG'
    if (store.get('advance.sign.name') !== '')
      value += ' by ' + store.get('advance.sign.name') + '.------'
    else value += '.------'
    value += '\n'
  }

  let hexmodeIndex = 0
  editorInst.getModel().setValue(value)

  // generate serial data clear event
  const event = new CustomEvent('serialDataCleanup')
  let el = document.getElementById('chart-figure')
  el.dispatchEvent(event)
}

document.getElementById('editor-font-family').onblur = (e) => {
  let font = e.target.value.trim()

  if (font === '') font = defaultFont
  editorInst.updateOptions({ fontFamily: font })
  store.set('general.fontFamily', font)
}

document.getElementById('editor-font-size').onblur = (e) => {
  let size = e.target.value.trim()
  if (size === '') size = 12

  editorInst.updateOptions({ fontSize: size })
  store.set('general.fontSize', size)
}

document.getElementById('breakpoint-switch').onclick = (e) => {
  if (e.target.checked === true) {
    if (store.get('advance.breakpoint.onText.length') === 0) {
      toast('Error: Breakpoint on-text can not be empty')
      e.target.checked = false
      return
    }
  }

  store.set('advance.breakpoint.switch', e.target.checked)
  breakpointHit = false
  breakpointAfterLines = 0
}

document.getElementById('capture-file-switch').onclick = (e) => {
  if (e.target.checked === true) {
    let fileName = monacoUtilities.generateFileName()

    dialog
      .showSaveDialog({
        properties: ['createDirectory'],
        defaultPath: fileName,
        filters: [{ extensions: ['log'] }],
      })
      .then((result) => {
        let pathEle = document.getElementById('capture-file-path')
        if (result.canceled === false) {
          let filePath = result.filePath
          pathEle.value = filePath
          captureFileStream = fs.createWriteStream(filePath, { flags: 'w' })

          store.set('fileops.capture.switch', true)
          store.set('fileops.capture.filePath', filePath)
        } else {
          if (undefined !== captureFileStream) captureFileStream.end()
          captureFileStream = undefined
          pathEle.value = ''

          store.set('fileops.capture.switch', false)
          store.set('fileops.capture.filePath', '')

          // restore check status
          e.target.checked = false
        }
      })
  } else {
    if (undefined !== captureFileStream) captureFileStream.end()
    captureFileStream = undefined

    store.set('fileops.capture.switch', false)
  }
}

document.getElementById('capture-file-path').ondblclick = (e) => {
  const file = e.target.value
  const text = fs.readFileSync(file).toString()
  editorInst.getModel().setValue(text)
}

document.getElementById('editor-area').ondragover = () => {
  return false
}

document.getElementById('editor-area').ondragleave = () => {
  return false
}

document.getElementById('editor-area').ondragend = () => {
  return false
}

document.getElementById('editor-area').ondrop = (e) => {
  console.log('ondrop')
  e.preventDefault()

  let f = e.dataTransfer.files[0]

  f.text().then((text) => {
    editorInst.getModel().setValue(text)
  })

  return false
}

function editorStateReset() {
  breakpointHit = false
  breakpointAfterLines = 0
  breakpointBuff = []
  half_line = false
  ansiWait = false

  hlt.reset()
}
