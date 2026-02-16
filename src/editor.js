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
const hlt = require('./modules/highlight.js')
const hexMode = require('./modules/hex-mode.js')
const chromeTabsModule = require('./modules/chrome-tabs.js')
const hexy = require('hexy')
const { chartFrameProcess } = require('./modules/chart.js')
const { serialInit, serialClose } = require('./modules/serialport.js')
const { getTimestamp } = require('./modules/utilities.js')
const fs = require('fs')
const { toast } = require('./modules/utilities.js')

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
/** @type {import('fs').WriteStream | undefined} */
let captureFileStream
/** @type {string | null} */
let captureFilePath = null

// Listen for captureFileStream changes from dom-utilities.js
document.addEventListener('captureFileChanged', (event) => {
  const { filePath, isActive } = event.detail;

  if (isActive && filePath) {
    // Store file path for synchronous writes
    captureFilePath = filePath;
    // Create new capture file stream (keep for backward compatibility)
    captureFileStream = fs.createWriteStream(filePath, { flags: 'r+' });
    console.log('Capture file activated:', filePath);
  } else {
    // Close existing stream if it exists
    if (captureFileStream) {
      captureFileStream.end();
      captureFileStream = undefined;
    }
    captureFilePath = null;
    console.log('Capture file deactivated');
  }
});

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

  if (null !== captureFilePath) {
    fs.appendFileSync(captureFilePath, textString);
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
    monacoInst = await initMonacoESMCompat()

    // Register custom language
    monacoInst.languages.register({
      id: 'comNGLang',
    })

    // Configure Monaco utilities
    const { configureComNGLanguageTokens, defineComNGTheme, createComNGEditor, configureComNGLanguage } = require('./modules/monaco-utilities.js')

    // Configure language tokens
    configureComNGLanguageTokens(monacoInst)

    // Define custom theme
    defineComNGTheme(monacoInst)

    // Create editor instance
    editorInst = createComNGEditor(monacoInst, store)

    // Configure language settings
    configureComNGLanguage(monacoInst)

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

    // Initialize ChromeTabs module and get direct references
    chromeTabsModule.initChromeTabs()



    document.addEventListener('portClosed', (event) => {
      _editorStateReset()
    });

    // Initialize hex mode handler
    hexMode.initHexModeHandlers(editorInst, monacoInst, hlt)

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
