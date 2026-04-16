// Monaco-specific utilities module

/**
 * Configure custom language token provider for comNGLang
 * @param {import('monaco-editor')} monacoInst - Monaco editor instance
 */
function configureComNGLanguageTokens(monacoInst) {
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
        [/\s*->\s*/, 'warn'], // for tx message indicator
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
}

/**
 * Define custom theme for comNG editor
 * @param {import('monaco-editor')} monacoInst - Monaco editor instance
 */
function defineComNGTheme(monacoInst) {
  // Light theme (default)
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
      { token: '', background: 'dee1e6' },
    ],
  })

  // Dark theme variant
  monacoInst.editor.defineTheme('comNGThemeDark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'number', foreground: '5FEA77' },
      { token: 'bracket', foreground: 'FFB86C' },
      { token: 'timestamp', foreground: 'FFB86C' },
      { token: 'time', foreground: '8BE9FD' },
      { token: 'ip', foreground: '8BE9FD' },
      { token: 'mac', foreground: 'EAF48C' },
      { token: 'fatal', foreground: 'FF5555' },
      { token: 'error', foreground: 'FF6E6E' },
      { token: 'warn', foreground: 'FFB86C' },
      { token: 'info', foreground: 'F5F5EF' },
      { token: 'trace', foreground: 'D6ACFF' },
      { token: 'debug', foreground: '69FF94' },
      { token: 'useless', foreground: '6272A4' },
      { token: '', background: '191a21' },
    ],
    colors: {
      'editor.background': '#2d2f3e',
      'editor.foreground': '#F5F5EF',
      'editorLineNumber.foreground': '#6272A4',
      'editor.selectionBackground': '#5FEA7740',
      'editorCursor.foreground': '#F5F5EF',
    },
  })
}

/**
 * Create Monaco editor instance with comNG configuration
 * @param {import('monaco-editor')} monacoInst - Monaco editor instance
 * @param {object} store - Application store instance
 * @returns {import('monaco-editor').editor.IStandaloneCodeEditor} Editor instance
 */
function createComNGEditor(monacoInst, store) {
  let readOnlyEditor = false
  if (true === store.get('general.hexmode')) {
    readOnlyEditor = true
  }

  // Determine theme based on dark theme setting
  const theme = store.get('general.darkTheme') ? 'comNGThemeDark' : 'comNGTheme'

  return monacoInst.editor.create(document.getElementById('editor-area'), {
    model: null,
    theme: theme,
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
    scrollbar: {
      vertical: 'auto',
      useShadows: false,
    },
  })
}

/**
 * Configure language settings for comNGLang
 * @param {import('monaco-editor')} monacoInst - Monaco editor instance
 */
function configureComNGLanguage(monacoInst) {
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
}

/**
 * Update editor theme based on dark theme setting
 * @param {import('monaco-editor').editor.IStandaloneCodeEditor} editor - Monaco editor instance
 * @param {object} store - Application store instance
 */
function updateEditorTheme(editor, monaco, store) {
  if (!editor || !monaco) return

  const theme = store.get('general.darkTheme') ? 'comNGThemeDark' : 'comNGTheme'
  monaco.editor.setTheme(theme)
}

module.exports = {
  configureComNGLanguageTokens,
  defineComNGTheme,
  createComNGEditor,
  configureComNGLanguage,
  updateEditorTheme,
}
