const { dialog } = require('electron').remote
const store = require('./store.js').init()
const { generateFileName } = require('./utilities.js')

function autoScrolldownBtnInit() {
  const el = document.getElementById('auto-scrolldown-btn')
  const currentState = store.get('general.autoScrolldown')
  if (currentState === true) {
    el.classList.remove('grey')
  } else {
    el.classList.add('grey')
  }

  el.addEventListener('click', () => {
    let newState = !store.get('general.autoScrolldown')
    store.set('general.autoScrolldown', newState)
    if (newState === true) {
      el.classList.remove('grey')
    } else {
      el.classList.add('grey')
    }
  })
}

// Capture file switch handler
function initCaptureFileHandler() {
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
          let pathEl = document.getElementById('capture-file-path')
          if (result.canceled === false) {
            let filePath = result.filePath
            pathEl.value = filePath
            // Dispatch event to notify editor.js that capture file is ready
            const event = new CustomEvent('captureFileChanged', {
              detail: { filePath: filePath, isActive: true }
            });
            document.dispatchEvent(event);

          } else {
            pathEl.value = ''

            // Dispatch event to notify editor.js that capture is disabled
            const event = new CustomEvent('captureFileChanged', {
              detail: { filePath: null, isActive: false }
            });
            document.dispatchEvent(event);


            // restore check status
            e.target.checked = false
          }
        })
    } else {
      // Dispatch event to notify editor.js that capture is disabled
      const event = new CustomEvent('captureFileChanged', {
        detail: { filePath: null, isActive: false }
      });
      document.dispatchEvent(event);
    }
  }
}

// Breakpoint settings handlers
function initBreakpointHandlers() {
  document.getElementById('breakpoint-on-text').onblur = (e) => {
    store.set('advance.breakpoint.onText', e.target.value)
  }

  document.getElementById('breakpoint-after-lines').onblur = (e) => {
    let lines = parseInt(e.target.value)

    if (isNaN(lines) === true) lines = 5
    store.set('advance.breakpoint.afterLines', lines)
  }
}

// Initialize all DOM utilities
function initDomUtilities() {
  autoScrolldownBtnInit()
  initCaptureFileHandler()
  initBreakpointHandlers()
}

module.exports = {
  autoScrolldownBtnInit,
  initCaptureFileHandler,
  initBreakpointHandlers,
  initDomUtilities
}
