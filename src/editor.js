/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const path = require('path')
const _loadMonaco = require('./modules/monaco.js')
const monacoUtilities = require('./modules/monaco-utilities.js')
const hlt = require('./modules/highlight.js')

const fs = require('fs')
const { dialog } = require('electron').remote
const hexy = require('hexy')
const languageDetect = require('language-detect')
const chokidar = require('chokidar')
const ChromeTabs = require('chrome-tabs')
let chromeTabs = new ChromeTabs()

const hmUnitCount = 16
const hmUnitBytes = 2
const hmUnitSpanLength = 1
const hmUnitLength = hmUnitBytes + hmUnitSpanLength // 3

const hmAddrOffset = 1
const hmAddrLength = 10
const hmHexOffset = hmAddrOffset + hmAddrLength // 11
const hmHexLength = hmUnitLength * hmUnitCount // 16 * 3 = 48
const hmSpanOffset = hmHexOffset + hmHexLength // 59
const hmSpanLength = 3
const hmStrOffset = hmSpanOffset + hmSpanLength // 62
const hmStrLength = 16
const hmEofOffset = hmStrOffset + hmStrLength // 78
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

// tabEl -> view
// view -> {path, model, state}
let tabsMap = new Map()

// -----------------------chokidar watch section
const watcher = chokidar.watch('./a.bc', {
  ignored: /(^|[/\\])\../, // ignore dotfiles
  persistent: true,
})

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
function uriFromPath(_path) {
  let pathName = path.resolve(_path).replace(/\\/g, '/')
  if (pathName.length > 0 && !pathName.startsWith('/')) {
    pathName = '/' + pathName
  }
  return encodeURI('file://' + pathName)
}

function openFile() {
  dialog
    .showOpenDialog({
      properties: ['openFile'],
    })
    .then((result) => {
      if (result.canceled === false) {
        const filePath = result.filePaths[0]
        // add to watcher
        watcher.add(filePath)
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
  chromeTabs.addTab()
  openFile()
}

function openBinFile() {
  if (true !== store.get('general.hexmode')) {
    toast("Please first enable 'Hex Mode' in General tab.")
    return
  }

  dialog
    .showOpenDialog({
      properties: ['openFile'],
    })
    .then((result) => {
      if (result.canceled === false) {
        const filePath = result.filePaths[0]
        // show hex text
        editorInst.getModel().setValue('')
        fs.readFile(filePath, (e, data) => {
          if (e) throw err
          hexModeProcess(data, false)
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
        // 2. setup filepath
        tabsMap.get(el).path = filePath
        // 3. setup title
        let titleEl = el.querySelector('.chrome-tab-title')
        el.align = 'center'
        titleEl.innerHTML = title
      }
    })
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

function newTab() {
  chromeTabs.addTab()
}

function switchTab(tabIndex) {
  const elParent = chromeTabs.el.children[0]

  if (tabIndex >= elParent.childElementCound) return
  const el = elParent.children[tabIndex - 1]
  chromeTabs.setCurrentTab(el)
}

function hexModeProcess(buffer, revealLine) {
  const text = hexy.hexy(buffer, { format: 'twos' })

  monacoUtilities.applyEdit(monacox, editorInst, text, false, revealLine)
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

window.addEventListener('monacoloaded', (e) => {
  monacox = e.detail.monaco

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
      { token: 'timestamp', foreground: 'ff9800' },
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
    lineNumbersMinChars: 4,
    // minimap: {
    //   enabled: false,
    // },
    scrollbar: {
      vertical: 'auto',
      useShadows: false,
      verticalScrollbarSize: 10,
    },
  })

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

  function _getLinePairRange(range) {
    let s = range.startColumn
    if (s <= hmSpanOffset) {
      // hex area
      if (s < hmHexOffset) s = range.startColumn = hmHexOffset
      s = Math.round((s - hmHexOffset) / hmUnitLength) + hmStrOffset
    } else {
      // str area
      if (s < hmStrOffset) s = range.startColumn = hmStrOffset
      s = (s - hmStrOffset) * hmUnitLength + hmHexOffset
    }

    let e = range.endColumn
    if (e <= hmStrOffset) {
      // hex area
      if (e < hmHexOffset) e = range.endColumn = hmHexOffset
      if (e > hmSpanOffset) e = range.endColumn = hmSpanOffset
      e = Math.round((e - hmHexOffset) / hmUnitLength) + hmStrOffset
    } else {
      // str area
      if (e < hmStrOffset) e = range.endColumn = hmStrOffset
      e = (e - hmStrOffset) * hmUnitLength + hmHexOffset
    }

    return new monacox.Range(range.startLineNumber, s, range.startLineNumber, e)
  }

  function _showCursors(model, range) {
    let cordRange = _getLinePairRange(range)
    if (undefined === cordRange) return

    // first remove old decos
    let decos = model.getLineDecorations(range.startLineNumber)
    for (let deco of decos) {
      if (deco.options.className === 'hex-cursor') {
        model.deltaDecorations([deco.id], [])
      }
    }

    model.deltaDecorations(
      [],
      [
        {
          range: range,
          options: {
            className: 'hex-cursor',
            zIndex: 999,
          },
        },
        {
          range: cordRange,
          options: {
            className: 'hex-cursor',
            zIndex: 999,
            overviewRuler: {
              color: '#f06292',
              position: 4, // 2: center, 4: right, 1: left, 7: full
            },
          },
        },
      ]
    )
  }

  function _selectRanges(model, range, pairRange, decoration) {
    // first remove old decos
    let decos = model.getLineDecorations(range.startLineNumber)
    let zIndex = 1
    for (let deco of decos) {
      if (deco.options.className !== null && deco.options.className.indexOf('hl-') !== -1) {
        if (deco.options.zIndex >= zIndex) zIndex = deco.options.zIndex + 1
      }
    }

    // then apply new decos
    model.deltaDecorations(
      [],
      [
        {
          range: range,
          options: {
            className: decoration.style,
            zIndex: zIndex,
          },
        },
        {
          range: pairRange,
          options: {
            className: decoration.style,
            zIndex: zIndex,
            overviewRuler: {
              color: decoration.color,
              position: 4, // 2: center, 4: right, 1: left, 7: full
            },
          },
        },
      ]
    )
  }

  function _extractLineRange(range, line) {
    let s = 1
    let e = 1

    if (line === range.startLineNumber) {
      s = range.startColumn
      if (s <= hmSpanOffset) {
        // hex area
        if (range.startLineNumber !== range.endLineNumber) e = hmSpanOffset
        else e = range.endColumn
      } else {
        // str area
        if (range.startLineNumber !== range.endLineNumber) e = hmEofOffset
        else e = range.endColumn
      }
    } else if (line === range.endLineNumber) {
      e = range.endColumn
      if (e <= hmStrOffset) {
        // hex area
        if (range.startLineNumber !== range.endLineNumber) s = hmHexOffset
        else s = range.startColumn
      } else {
        // str area
        if (range.startLineNumber !== range.endLineNumber) s = hmStrOffset
        else s = range.startColumn > hmStrOffset ? range.startColumn : hmStrOffset
      }
    } else {
      // default hex area
      s = hmHexOffset
      e = hmSpanOffset
    }

    return new monacox.Range(line, s, line, e)
  }

  editorInst.onMouseUp(() => {
    if (false === store.get('general.hexmode')) return

    let model = editorInst.getModel()
    let range = editorInst.getSelection()
    console.log('In: ' + range)

    if (range.isEmpty() === true) {
      _showCursors(model, range)
    } else {
      let deco = hlt.decoGet()
      for (let line = range.startLineNumber; line <= range.endLineNumber; line++) {
        let lineRange = _extractLineRange(range, line)
        let linePairRange = _getLinePairRange(lineRange)
        _selectRanges(model, lineRange, linePairRange, deco)
      }
    }
  })

  // --------------------------Chrometabs section, refer to:
  // https://stackoverflow.com/questions/38266951/how-to-create-chrome-like-tab-on-electron
  const tabsEl = document.getElementById('tabs-area')

  tabsEl.addEventListener('tabAdd', ({ detail }) => {
    // console.log("tab add");
    navigator_layout_update()

    // create a new model
    let model = monacox.editor.createModel()
    editorInst.setModel(model)
    monacox.editor.setModelLanguage(model, 'comNGLang')

    let el = detail.tabEl
    // setup the title with time
    let title = monacoUtilities.generateFileName()
    let titleEl = el.querySelector('.chrome-tab-title')
    el.align = 'center'
    titleEl.innerHTML = title

    // setup content change listener for model
    model.onDidChangeContent((e) => {
      // console.log(e);
      if (e.isFlush === true) return
      el.children[2].children[1].style.color = '#26a69a'
    })

    // setup the map between table and model/state
    let view = {
      model: model,
      path: null,
      state: null,
    }
    tabsMap.set(el, view)
  })

  tabsEl.addEventListener('activeTabChange', ({ detail }) => {
    let el = detail.tabEl

    // Save before tab's state
    let model = editorInst.getModel()
    tabsMap.forEach((view, _) => {
      if (model === view.model) {
        view.state = editorInst.saveViewState()
      }
    })

    // Restore new tab's state
    let view = tabsMap.get(el)
    editorInst.setModel(view.model)
    editorInst.restoreViewState(view.state)
  })

  tabsEl.addEventListener('tabRemove', ({ detail }) => {
    // console.log("tab remove");
    navigator_layout_update()

    // delete from watcher
    const view = tabsMap.get(detail.tabEl)
    if (null !== view.path) {
      watcher.unwatch(view.path)
    }

    // delete from tabsMap
    tabsMap.delete(detail.tabEl)
    if (0 === tabsMap.size) chromeTabs.addTab()
  })

  chromeTabs.init(tabsEl)
  chromeTabs.addTab()
  document.getElementById('tab-add-btn').onclick = () => {
    chromeTabs.addTab()
  }
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
  window.dispatchEvent(event)
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
      toast('Error: Breakpoint on-text cant be empty')
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
