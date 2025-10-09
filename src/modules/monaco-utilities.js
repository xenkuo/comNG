const { remote } = require('electron')
const { dialog } = require('electron').remote
const store = remote.getGlobal('store')
const fs = require('fs')
const { get } = require('http')

let captureFileStream
let textDownward = true

function generateFileName() {
  let date = new Date()
  date = date.toString().split(' ')
  let name = date[0] + '-' + date[4].replace(/[.|:]/g, '-') + '.log'

  return name
}

function getTimestamp() {
  const t = new Date()

  return (
    t.toLocaleTimeString().split(' ')[0] + ':' + t.getMilliseconds().toString().padStart(3, 0) + ' '
  )
}

function applyEdit(monaco, editor, textString, appendLine, revealLine) {
  const model = editor.getModel()
  const lineCount = model.getLineCount()
  let lastLineLength = 1
  if (true === appendLine) {
    lastLineLength = model.getLineMaxColumn(lineCount)
  }

  const range = new monaco.Range(lineCount, lastLineLength, lineCount, lastLineLength)

  editor.getModel().applyEdits([
    {
      forceMoveMarkers: true,
      range: range,
      text: textString,
    },
  ])

  if (undefined !== captureFileStream) {
    captureFileStream.write(textString)
  }

  if (true === revealLine && textDownward === true) editor.revealLine(model.getLineCount())
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

document.getElementById('downward-btn').onclick = (e) => {
  if (textDownward === true) {
    textDownward = false
    e.target.classList.add('grey')
  } else {
    textDownward = true
    e.target.classList.remove('grey')
  }
}

document.getElementById('breakpoint-on-text').onblur = (e) => {
  store.set('advance.breakpoint.onText', e.target.value)
}

document.getElementById('breakpoint-after-lines').onblur = (e) => {
  let lines = parseInt(e.target.value)

  if (isNaN(lines) === true) lines = 5
  store.set('advance.breakpoint.afterLines', lines)
}

module.exports = {
  applyEdit,
  generateFileName,
  getTimestamp,
}
