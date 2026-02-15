/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

/// <reference path="./modules/monaco-esm.js" />

// Monaco Editor Type Definitions for better IDE support
/** @typedef {import('monaco-editor').editor.IStandaloneCodeEditor} IStandaloneCodeEditor */
/** @typedef {import('monaco-editor').editor.IModel} IModel */
/** @typedef {import('monaco-editor').editor.IRange} IRange */
/** @typedef {import('monaco-editor').languages.IMonarchLanguage} IMonarchLanguage */
/** @typedef {import('monaco-editor')} MonacoAPI */

const path = require('path')
// Use ESM-compatible Monaco loader for better IDE support
const { initMonacoESMCompat } = require('./modules/monaco-esm.js')
const monacoUtilities = require('./modules/monaco-utilities.js')
const hlt = require('./modules/highlight.js')
const hexMode = require('./modules/hex-mode.js')
const chromeTabsModule = require('./modules/chrome-tabs.js')
const hexy = require('hexy')
const { chartFrameProcess } = require('./modules/chart.js')
const { serialInit, serialClose } = require('./modules/serialport.js')
const { generateFileName, getTimestamp } = require('./modules/utilities.js')
const fs = require('fs')

const { dialog } = require('electron').remote
const languageDetect = require('language-detect')

const { initIPCHandlers } = require('./modules/ipc-handler.js')

/** @type {MonacoAPI} */
let monacoInst = null
/** @type {IStandaloneCodeEditor} */
let editorInst

// Monaco Editor Helper Types
// monacoInst: Main Monaco API object (contains .editor, .languages, etc.)
// editorInst: Actual editor instance (created by monaco.editor.create())
// Use these in JSDoc comments for better IDE support:
// @type {IModel} - for editor models
// @type {IRange} - for editor ranges
// @param {import('monaco-editor').editor.IStandaloneEditorConstructionOptions} options - Editor options
let breakpointHit = false
let breakpointAfterLines = 0
let breakpointBuff = []
let half_line = false
let ansiWait = false
let captureFileStream

function _editorStateReset() {
  breakpointHit = false
  breakpointAfterLines = 0
  breakpointBuff = []
  half_line = false
  ansiWait = false

  hlt.reset()
}

/**
 * Apply edits to the Monaco editor
 * @param {string} textString - Text to insert
 * @param {boolean} appendLine - Whether to append to current line
 * @param {boolean} revealLine - Whether to scroll to the line
 */
function _applyEdit(textString, appendLine, revealLine) {
  const model = editorInst.getModel()
  const lineCount = model.getLineCount()
  let lastLineLength = 1
  if (true === appendLine) {
    lastLineLength = model.getLineMaxColumn(lineCount)
  }

  const range = new monacoInst.Range(lineCount, lastLineLength, lineCount, lastLineLength)

  editorInst.getModel().applyEdits([
    {
      forceMoveMarkers: true,
      range: range,
      text: textString,
    },
  ])

  if (undefined !== captureFileStream) {
    captureFileStream.write(textString)
  }

  if (true === revealLine && store.get('general.autoScrolldown', true) === true) editorInst.revealLine(model.getLineCount())
}

const { initWatcher } = require('./modules/watcher.js')
const watcherModule = initWatcher(store)
/** @type {import('chokidar').FSWatcher} */
const watcher = watcherModule.watcher

// ------------------------editor section

function _openFile() {
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
          monacoInst.editor.setModelLanguage(model, lang.toLowerCase())
        }

        // show text
        fs.readFile(filePath, 'utf8', (e, data) => {
          if (e) throw e
          editorInst.getModel().setValue(data)
        })

        // setup tab
        const title = path.basename(filePath)
        const el = chromeTabsModule.chromeTabs.activeTabEl
        const view = chromeTabsModule.tabsMap.get(el)

        // 1. setup file watcher
        if (null !== view.path) {
          watcher.unwatch(view.path)
        }
        watcher.add(filePath)
        // 2. setup tabsMap file path
        chromeTabsModule.tabsMap.get(el).path = filePath
        // 3. setup title
        let titleEl = el.querySelector('.chrome-tab-title')

        // el.align = 'center'
        titleEl.innerHTML = title
      }
    })
}
/**
 * Open binary file in hex mode
 */
function _openBinFile() {
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
          _hexModeProcess(data, false)
        })

        // setup tab
        const title = path.basename(filePath)
        const el = chromeTabsModule.chromeTabs.activeTabEl
        const view = chromeTabsModule.tabsMap.get(el)
        // 1. setup file watcher
        if (null !== view.path) {
          watcher.unwatch(view.path)
        }
        watcher.add(filePath)
        // 2. setup filepath
        chromeTabsModule.tabsMap.get(el).path = filePath
        // 3. setup title
        let titleEl = el.querySelector('.chrome-tab-title')
        el.align = 'center'
        titleEl.innerHTML = title
      }
    })
}

// ----------------------editor function section
function openFileInNewTab() {
  chromeTabsModule.newTab()
  _openFile()
}

function openBinFileInNewTab() {
  chromeTabsModule.newTab()
  _openBinFile()
}




function saveFile() {
  const el = chromeTabsModule.chromeTabs.activeTabEl
  const view = chromeTabsModule.tabsMap.get(el)
  if (view.path !== null) {
    // has path info
    const text = editorInst.getModel().getValue()
    fs.writeFileSync(view.path, text)
    el.children[2].children[1].style.color = '#000000'

    // update localSave state
    watcherModule.setLocalSave(true)
  } else {
    // no path info
    const fileName = chromeTabsModule.chromeTabs.activeTabEl.innerText

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
            monacoInst.editor.setModelLanguage(view.model, lang.toLowerCase())
          }
        }
      })
  }
}

function saveAsFile() {
  const el = chromeTabsModule.chromeTabs.activeTabEl
  const view = chromeTabsModule.tabsMap.get(el)
  // no path info
  const fileName = chromeTabsModule.chromeTabs.activeTabEl.innerText

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
          monacoInst.editor.setModelLanguage(view.model, lang.toLowerCase())
        }
      }
    })
}

initIPCHandlers({
  openFileHandler: openFileInNewTab,
  openBinFileHandler: openBinFileInNewTab,
  saveFileHandler: saveFile,
  saveAsFileHandler: saveAsFile,
})


/**
 * Process binary buffer data into hex format and display in editor
 * @param {Buffer} buffer - Binary data to process
 * @param {boolean} revealLine - Whether to reveal the line after processing
 */
function _hexModeProcess(buffer, revealLine) {
  const text = hexy.hexy(buffer, { format: 'twos' })
  _applyEdit(text, false, revealLine)
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

// function _filterAnsiCode(inBuffer) {
//   let inArray = [...inBuffer]
//   let outArray = []
//   let arrayLen = inArray.length

//   for (let i = 0; i < arrayLen; i++) {
//     if (ansiWait === false) {
//       if (0x1b !== inArray[i]) {
//         // \u001b
//         outArray.push(inArray[i])
//       } else {
//         ansiWait = true
//       }
//     } else if (0x6d === inArray[i]) {
//       // m
//       ansiWait = false
//     }
//   }

//   return Buffer.from(outArray)
// }

function _stringModeProcess(inBuffer) {
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

      if (store.get('general.timestamp') === true) timestamp = getTimestamp()
      outputTmp = timestamp + line
    }
    _applyEdit(
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

      if (store.get('general.timestamp') === true) timestamp = getTimestamp()
      outputTmp = timestamp + buffer
      half_line = true
    }
    _applyEdit(
      outputTmp.toString().replace(/[^\x20-\x7E\n\r\t]/g, '.'),
      true,
      true
    )
  }
  if (store.get('advance.breakpoint.switch') === true) {
    breakpointBuff = buffer
  }
}

/**
 * Unified serial data processing function
 * Handles both hex mode and string mode processing, including chart data
 * @param {Buffer} data - Serial data buffer
 */
function processSerialData(data) {
  if (store.get('general.hexmode') === true) {
    _hexModeProcess(data, true)
  } else {
    chartFrameProcess(data)
    _stringModeProcess(data)
  }
}

serialInit(processSerialData)



const { clipboard } = require('electron')

document.getElementById('data-cleanup-btn').onclick = () => {
  let value = ''

  if (store.get('advance.sign.switch') === true) {
    value = '------This file captured at ' + new Date().toLocaleString() + ' with comNG'
    if (store.get('advance.sign.name') !== '')
      value += ' by ' + store.get('advance.sign.name') + '.------'
    else value += '.------'
    value += '\n'
  }

  // store current content to clipboard
  clipboard.writeText(editorInst.getModel().getValue())

  // Clear editor content
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
    let fileName = generateFileName()

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

/**
 * Async editor setup function
 * Initializes Monaco editor and returns the instance directly
 * @returns {Promise<import('monaco-editor').editor.IStandaloneCodeEditor>} Editor instance
 */
async function setupEditor() {
  try {
    // Load Monaco editor and get instance directly
    const monaco = await initMonacoESMCompat()
    monacoInst = monaco

    // Register custom language
    monacoInst.languages.register({
      id: 'comNGLang',
    })
    monacoInst.languages.setMonarchTokensProvider('comNGLang', {
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
    monacoInst.editor.defineTheme('comNGTheme', {
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
    editorInst = monacoInst.editor.create(document.getElementById('editor-area'), {
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

    document.addEventListener('tabAdded', (event) => {
      const el = event.detail.tabEl;
      console.log('Tab added:', el);
      // create a new model
      let model = monacoInst.editor.createModel();
      editorInst.setModel(model);
      monacoInst.editor.setModelLanguage(model, 'comNGLang');

      // setup content change listener for model
      model.onDidChangeContent((e) => {
        if (e.isFlush === true) return;
        el.children[2].children[1].style.color = '#ff8a80';
        el.children[2].children[1].style.fontWeight = 'bold';
      });
      // setup the map between tab and model/state
      let view = {
        model: model,
        path: null,
        state: null,
      };
      chromeTabsModule.tabsMap.set(el, view);
    });

    document.addEventListener('tabRemoved', (event) => {
      const el = event.detail.tabEl;
      console.log('Tab removed:', el);

      const view = chromeTabsModule.tabsMap.get(el)
      if (null !== view.path) {
        watcher.unwatch(view.path)
      }

      // delete from tabsMap
      chromeTabsModule.tabsMap.delete(el)
      if (0 === chromeTabsModule.tabsMap.size) chromeTabsModule.newTab()
    });

    document.addEventListener('activeTabChanged', (event) => {
      const el = event.detail.tabEl;
      console.log('Active tab changed:', el);

      // Save before tab's state
      let model = editorInst.getModel()
      chromeTabsModule.tabsMap.forEach((view, _) => {
        if (model === view.model) {
          view.state = editorInst.saveViewState()
        }
      })

      // Restore new tab's state
      let view = chromeTabsModule.tabsMap.get(el)
      editorInst.setModel(view.model)
      editorInst.restoreViewState(view.state)
    });

    document.addEventListener('portClosed', (event) => {
      _editorStateReset()
    });

    monacoInst.languages.setLanguageConfiguration('comNGLang', {
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
      keybindings: [monacoInst.KeyMod.CtrlCmd + monacoInst.KeyCode.KEY_E],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 3.5,
      run: hlt.toggle,
    })

    editorInst.addAction({
      id: 'highlight-clear-all',
      label: 'Highlight Clear All',
      keybindings: [monacoInst.KeyMod.CtrlCmd + monacoInst.KeyMod.Shift + monacoInst.KeyCode.KEY_E],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 3.6,
      run: hlt.clear,
    })

    editorInst.addCommand(monacoInst.KeyMod.CtrlCmd + monacoInst.KeyCode.KEY_W, () => {
      // Do nothing but prevent default action: close window
    })

    // editor.addCommand(monacoInst.KeyMod.CtrlCmd + monacoInst.KeyCode.KEY_X, () => {
    //   // Do nothing but prevent default action: close window
    // });

    // Hex mode functions are now in the hex-mode module

    // Initialize hex mode handler
    hexMode.initHexModeHandlers(editorInst, monacoInst, hlt)

    // Initialize ChromeTabs module and get direct references
    chromeTabsModule.initChromeTabs()

    // Return the editor instance
    return editorInst;

  } catch (error) {
    console.error('Failed to setup editor:', error);
    throw error;
  }
}

// Initialize the editor asynchronously
setupEditor().then(editor => {
  console.log('Editor initialized successfully');
  // Editor is ready and available as 'editor' parameter
}).catch(error => {
  console.error('Failed to initialize editor:', error);
});
