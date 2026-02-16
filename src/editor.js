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
// Conditionally load chart module to improve startup performance
let chartModule = null
let chartLoadAttempted = false

function getChartModule() {
  if (!chartModule && !chartLoadAttempted) {
    chartLoadAttempted = true
    try {
      // Use require for CommonJS modules with side effects
      const module = require('./modules/chart.js')
      chartModule = {
        chartFrameProcess: module.chartFrameProcess
      }
      console.log('Chart module loaded')
    } catch (error) {
      console.error('Failed to load chart module:', error)
      // Fallback to no-op function
      chartModule = {
        chartFrameProcess: () => { }
      }
    }
  }
  return chartModule
}

// Wrapper function for chart processing
function lazyChartFrameProcess(data) {
  const chart = getChartModule()
  return chart.chartFrameProcess(data)
}
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
let ansiWait = false
/** @type {Buffer | null} */
let partialLineBuffer = null
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
  ansiWait = false
  partialLineBuffer = null

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
  if (store.get('general.timestamp') === true && true === revealLine) {
    let timestamp = ''
    timestamp = getTimestamp()
    _applyEdit(timestamp + '\n', false, true)
  }

  const text = hexy.hexy(buffer, { format: 'twos' })
  _applyEdit(text, false, revealLine)
}

/**
 * Process breakpoint detection for complete lines
 * @param {Buffer} line - Complete line buffer ending with newline
 * @returns {boolean} True if breakpoint condition is met
 */
function _breakpointProcess(line) {
  if (breakpointHit === false) {
    // Check if current line contains the breakpoint text
    if (line.includes(store.get('advance.breakpoint.onText')) === true) {
      breakpointHit = true
      breakpointAfterLines = 0
    }
  } else {
    // Count lines after breakpoint hit
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

/**
 * Process text data with optimized buffering - only outputs complete lines
 * @param {Buffer} inBuffer - Incoming data buffer
 */
function _textProcess(inBuffer) {
  // Combine with existing partial buffer if it exists
  let buffer = partialLineBuffer ? Buffer.concat([partialLineBuffer, inBuffer]) : inBuffer

  // Reset the partial buffer as we're processing the combined data
  partialLineBuffer = null

  // Process complete lines only
  let index = -1
  while ((index = buffer.indexOf('\n')) !== -1) {
    let line = buffer.slice(0, index + 1)
    buffer = buffer.slice(index + 1)

    // Add timestamp if enabled
    let outputLine = line
    if (store.get('general.timestamp') === true) {
      const timestamp = getTimestamp()
      if (store.get('general.hexmode') === true) {
        // In hex mode, add timestamp as separate line
        _applyEdit(timestamp + '\n', false, false)
      } else {
        // In string mode, prepend timestamp to the line
        outputLine = timestamp + line
      }
    }

    // Process the complete line
    if (store.get('general.hexmode') === true) {
      const hexOutput = hexy.hexy(outputLine, { format: 'twos' })
      _applyEdit(hexOutput, true, false)
    } else {
      const cleanOutput = outputLine.toString().replace(/[^\x20-\x7E\n\r\t]/g, '.')
      _applyEdit(cleanOutput, true, true)
    }

    // Handle breakpoints
    if (store.get('advance.breakpoint.switch') === true) {
      if (_breakpointProcess(line) === true) {
        buffer = Buffer.from('')
        serialClose()
        break
      }
    }
  }

  // Store remaining partial line for next processing
  if (buffer.length > 0) {
    partialLineBuffer = buffer
  }
}

/**
 * Unified serial data processing function
 * Handles both hex mode and string mode processing, including chart data
 * @param {Buffer} data - Serial data buffer
 */
function processSerialData(data) {
  // Process chart data conditionally (only loads when chart tab is used)
  try {
    lazyChartFrameProcess(data)
  } catch (err) {
    console.warn('Chart processing failed:', err)
  }

  _textProcess(data)
}

// Serial port callback - processSerialData is now synchronous
const syncProcessSerialData = (data) => {
  try {
    processSerialData(data)
  } catch (err) {
    console.error('Serial data processing failed:', err)
  }
}

serialInit(syncProcessSerialData)



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


    document.addEventListener('portClosed', (event) => {
      _editorStateReset()
    });


    hexMode.initHexModeHandlers(editorInst, monacoInst, hlt);


    // Return the editor instance
    return editorInst;

  } catch (error) {
    console.error('Failed to setup editor:', error);
    throw error;
  }
}

// Function to link existing tabs to editor model
function linkExistingTabs() {
  console.log('Checking for existing tabs to link...');

  // Get ChromeTabs module and check for existing tabs
  const chromeTabsModule = require('./modules/chrome-tabs.js');
  const tabsContainer = document.querySelector('.chrome-tabs');

  if (!tabsContainer) {
    console.log('No tabs container found');
    return;
  }

  // Find all existing tab elements
  const existingTabs = tabsContainer.querySelectorAll('.chrome-tab');
  console.log('Found', existingTabs.length, 'existing tabs');

  existingTabs.forEach((tabEl, index) => {
    // Check if this tab already has a model linked
    if (chromeTabsModule.tabsMap.has(tabEl)) {
      console.log('Tab already linked:', tabEl);
      return;
    }

    console.log('Linking existing tab:', tabEl);

    // Create model and link it (same as tabAdded handler)
    let model = monacoInst.editor.createModel();
    editorInst.setModel(model);
    monacoInst.editor.setModelLanguage(model, 'comNGLang');

    // Setup content change listener
    model.onDidChangeContent((e) => {
      if (e.isFlush === true) return;
      tabEl.children[2].children[1].style.color = '#ff8a80';
      tabEl.children[2].children[1].style.fontWeight = 'bold';
    });

    // Setup the map between tab and model/state
    let view = {
      model: model,
      path: null,
      state: null,
    };
    chromeTabsModule.tabsMap.set(tabEl, view);

    console.log('Successfully linked tab', index + 1);
  });
}

// Initialize the editor asynchronously
setupEditor().then(editor => {
  console.log('Editor initialized successfully');
  // Editor is ready and available as 'editor' parameter

  // Link any existing tabs that were created before editor was ready
  linkExistingTabs();

}).catch(error => {
  console.error('Failed to initialize editor:', error);
});

// Make function globally available for external use if needed
window.linkExistingTabs = linkExistingTabs;
