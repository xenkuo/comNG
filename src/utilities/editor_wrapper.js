/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const path = require('path')
const amdLoader = require('../node_modules/monaco-editor/min/vs/loader.js')
const amdRequire = amdLoader.require

const hlt = require('./highlight.js')

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

var editor

amdRequire.config({
  // eslint-disable-next-line no-undef
  baseUrl: uriFromPath(
    path.join(__dirname, '../node_modules/monaco-editor/min')
  ),
})

// workaround monaco-css not understanding the environment
self.module = undefined

amdRequire(['vs/editor/editor.main'], function () {
  monaco.languages.register({
    id: 'comNGLang',
  })
  monaco.languages.setMonarchTokensProvider('comNGLang', {
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
        [/\d{1,4}(-|\/|\.|:)\d{1,2}\1\d{1,4}/, 'time'],
        [
          /(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)(-|\/|\.|:)(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)\2(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)\2(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)/,
          'ip',
        ],
        [
          /[0-9a-fA-F]{2}(-|\/|\.|:)[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}/,
          'mac',
        ],
        [/\d*\.\d+([eE][-+]?\d+)?/, 'number'],
        [/0[xX][0-9a-fA-F]+/, 'number'],
        [/[0-9a-fA-F]{4,}/, 'number'],
        [/\d+/, 'number'],
      ],
    },
  })

  // Define a new theme that contains only rules that match this language
  monaco.editor.defineTheme('comNGTheme', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'number', foreground: '2e7d32' },
      { token: 'bracket', foreground: 'ff9800' },
      { token: 'timestamp', foreground: '009688' },
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
  editor = monaco.editor.create(document.getElementById('editor-area'), {
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

  let editorConfig = {
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['"', '"'],
      ["'", "'"],
    ],
  }
  monaco.languages.setLanguageConfiguration('comNGLang', editorConfig)

  editor.addAction({
    id: 'highlight-toggle',
    label: 'Highlight Toggle',
    keybindings: [monaco.KeyMod.CtrlCmd + monaco.KeyCode.KEY_E],
    precondition: null,
    keybindingContext: null,
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 3.5,
    run: hlt.toggle,
  })

  editor.addAction({
    id: 'highlight-clear-all',
    label: 'Highlight Clear All',
    keybindings: [
      monaco.KeyMod.CtrlCmd + monaco.KeyMod.Shift + monaco.KeyCode.KEY_E,
    ],
    precondition: null,
    keybindingContext: null,
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 3.6,
    run: hlt.clear,
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd + monaco.KeyCode.KEY_W, () => {
    // Do nothing but prevent default action: close window
  })

  // editor.addCommand(monaco.KeyMod.CtrlCmd + monaco.KeyCode.KEY_X, () => {
  //   // Do nothing but prevent default action: close window
  // });

  function getLinePairRange(range) {
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

    return new monaco.Range(range.startLineNumber, s, range.startLineNumber, e)
  }

  function showCursors(model, range) {
    let cordRange = getLinePairRange(range)
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

  function selectRanges(model, range, pairRange, decoration) {
    // first remove old decos
    let decos = model.getLineDecorations(range.startLineNumber)
    let zIndex = 1
    for (let deco of decos) {
      if (
        deco.options.className !== null &&
        deco.options.className.indexOf('hl-') !== -1
      ) {
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

  function extracLineRange(range, line) {
    let s = (e = 1)

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
        else
          s = range.startColumn > hmStrOffset ? range.startColumn : hmStrOffset
      }
    } else {
      // default hex area
      s = hmHexOffset
      e = hmSpanOffset
    }

    return new monaco.Range(line, s, line, e)
  }

  editor.onMouseUp(() => {
    if (false === store.get('general.hexmode')) return

    let model = editor.getModel()
    let range = editor.getSelection()
    console.log('In: ' + range)

    if (range.isEmpty() === true) {
      showCursors(model, range)
    } else {
      let deco = deco.get()
      for (
        let line = range.startLineNumber;
        line <= range.endLineNumber;
        line++
      ) {
        let lineRange = extracLineRange(range, line)
        let linePairRange = getLinePairRange(lineRange)
        selectRanges(model, lineRange, linePairRange, deco)
      }
    }
  })
})
