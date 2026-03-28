const { remote } = require('electron')

let locale = remote.app.getLocale()

// Fallback to 'zh' if locale is not detected
locale = locale || 'zh'

// For test
// locale = 'zh'

module.exports = {
  getLocale() {
    return locale
  },
}
