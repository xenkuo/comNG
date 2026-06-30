var decoIndex = 0

const decoTable = {
  light: [
    { style: 'hl-red', color: '#ff8a80' },
    { style: 'hl-orange', color: '#ffd180' },
    { style: 'hl-yellow', color: '#ffff8d' },
    { style: 'hl-green', color: '#b9f6ca' },
    { style: 'hl-blue', color: '#80d8ff' },
    { style: 'hl-indigo', color: '#8c9eff' },
    { style: 'hl-purple', color: '#ea80fc' },
  ],
  dark: [
    { style: 'hl-red', color: '#ff5555' },
    { style: 'hl-orange', color: '#ffb86c' },
    { style: 'hl-yellow', color: '#f1fa8c' },
    { style: 'hl-green', color: '#50fa7b' },
    { style: 'hl-blue', color: '#8be9fd' },
    { style: 'hl-indigo', color: '#bd93f9' },
    { style: 'hl-purple', color: '#ff79c6' },
  ],
}

function isDarkTheme() {
  if (typeof document === 'undefined' || !document.documentElement) return false
  return document.documentElement.dataset.theme === 'dark'
}

function getThemeDecoTable() {
  return isDarkTheme() ? decoTable.dark : decoTable.light
}

function decoGet() {
  const table = getThemeDecoTable()
  return table[decoIndex++ % table.length]
}

function getDecoColor(className) {
  const table = getThemeDecoTable()
  const entry = table.find((item) => item.style === className)
  return entry ? entry.color : table[0].color
}

function updateTheme(editor) {
  const model = editor && editor.getModel()
  if (!model) return

  const decorations = model.getAllDecorations()
  const updates = decorations
    .filter((deco) => deco.options.className && deco.options.className.indexOf('hl-') !== -1)
    .map((deco) => {
      const color = getDecoColor(deco.options.className)
      return {
        id: deco.id,
        range: deco.range,
        options: {
          ...deco.options,
          overviewRuler: {
            ...(deco.options.overviewRuler || {}),
            color,
            position: 4,
          },
        },
      }
    })

  if (updates.length > 0) {
    model.deltaDecorations(
      updates.map((item) => item.id),
      updates
    )
  }
}

function _apply(model, text) {
  let matches = model.findMatches(
    text,
    false,
    false,
    true,
    // "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
    null,
    false
  )
  let decoration = decoGet()

  console.log(decoration.style, decoration.color)

  for (let i of matches) {
    let range = i.range

    model.deltaDecorations(
      [],
      [
        {
          range: range,
          options: {
            className: decoration.style,
            overviewRuler: {
              color: decoration.color,
              position: 4, // position right
            },
          },
        },
      ]
    )
  }
}

// function _removeV0(model, text) {
//   let matches = model.findMatches(
//     text,
//     false,
//     false,
//     true,
//     // "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
//     null,
//     false
//   )

//   for (let match of matches) {
//     let decos = model.getDecorationsInRange(match.range)

//     // super word remove decoration will cause sub word decoration to 1
//     for (let deco of decos) {
//       model.deltaDecorations([deco.id], [])
//     }
//   }
// }

function _remove(model, targetClassName) {
  let decos = model.getAllDecorations()

  for (let deco of decos) {
    if (targetClassName === deco.options.className) {
      model.deltaDecorations([deco.id], [])
    }
  }
}

function reset() {
  decoIndex = 0
}

function hltToggle(editor) {
  console.log('highligh toggle')
  let model = editor.getModel()
  let range = editor.getSelection()
  let text = model.getValueInRange(range)
  if (text === '') {
    let word = model.getWordAtPosition(editor.getPosition())
    if (null === word) text = ''
    else {
      text = word.word
      range.startColumn = word.startColumn
      range.endColumn = word.endColumn
    }
  }

  if (text === '') return

  let applyDeco = 1
  let targetClassName = ''
  let targetzIndex = 0
  let decos = model.getDecorationsInRange(range)
  for (let deco of decos) {
    if (deco.options.className !== null && deco.options.className.indexOf('hl-') !== -1) {
      applyDeco = 0
      if (targetzIndex === 0) {
        targetzIndex = deco.options.zIndex
        targetClassName = deco.options.className
      } else {
        if (deco.options.zIndex > targetzIndex) {
          targetzIndex = deco.options.zIndex
          targetClassName = deco.options.className
        }
      }
    }
  }
  if (1 === applyDeco) {
    _apply(model, text)
  } else {
    _remove(model, targetClassName)
  }
  return null
}

function hltClear(editor) {
  console.log('highlight clear all')

  let model = editor.getModel()
  let decos = model.getAllDecorations()

  for (let deco of decos) {
    if (deco.options.className === null) continue
    if (deco.options.className.indexOf('hl-') !== -1 || deco.options.className === 'hex-cursor') {
      model.deltaDecorations([deco.id], [])
    }
  }
}
module.exports = {
  reset,
  decoGet,
  toggle: hltToggle,
  clear: hltClear,
  updateTheme,
}
