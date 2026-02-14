const { dialog } = require('electron').remote
const store = require('./store.js').init()
const fs = require('fs')
const { generateFileName } = require('./utilities.js')

let captureFileStream


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

document.getElementById('breakpoint-on-text').onblur = (e) => {
  store.set('advance.breakpoint.onText', e.target.value)
}

document.getElementById('breakpoint-after-lines').onblur = (e) => {
  let lines = parseInt(e.target.value)

  if (isNaN(lines) === true) lines = 5
  store.set('advance.breakpoint.afterLines', lines)
}

module.exports = {}
