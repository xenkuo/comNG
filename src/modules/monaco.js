// Handle the loading of the monaco editor in an Electron environment
/* eslint-disable no-undef */

function initMonaco() {
  const path = require('path')
  const amdLoader = require('../../node_modules/monaco-editor/min/vs/loader.js')
  const amdRequire = amdLoader.require

  function _uriFromPath(_path) {
    let pathName = path.resolve(_path).replace(/\\/g, '/')
    if (pathName.length > 0 && !pathName.startsWith('/')) {
      pathName = '/' + pathName
    }
    return encodeURI('file://' + pathName)
  }

  amdRequire.config({
    // eslint-disable-next-line no-undef
    baseUrl: _uriFromPath(path.join(__dirname, '../../node_modules/monaco-editor/min')),
  })

  // workaround monaco-css not understanding the environment
  self.module = undefined

  amdRequire(['vs/editor/editor.main'], function () {
    const event = new CustomEvent('monacoloaded', {
      detail: {
        monaco: monaco,
      },
    })
    window.dispatchEvent(event)
  })
}

module.exports = {
  initMonaco,
}
