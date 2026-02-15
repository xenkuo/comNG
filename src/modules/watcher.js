/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

// Type definitions for better IDE support
/** @typedef {import('chokidar').FSWatcher} FSWatcher */

const chokidar = require('chokidar')
const fs = require('fs')

/**
 * Initialize file watcher with event handlers
 * @param {object} chromeTabsModule - Chrome tabs module with tabsMap
 * @param {object} store - Application store instance
 * @returns {{watcher: FSWatcher, setLocalSave: function(boolean): void, getLocalSave: function(): boolean}} Watcher instance with utilities
 */
function initWatcher(chromeTabsModule, store) {
  // Initialize watcher
  const watcher = chokidar.watch('./a.bc', {
    ignored: /(^|[/\\])\../, // ignore dotfiles
    persistent: true,
  })

  // Local state for save operations
  let localSave = false

  // Watcher event handlers
  watcher.on('change', (filePath) => {
    // console.log(filePath + " content changed");
    if (true === localSave) {
      localSave = false
      return
    }
    chromeTabsModule.tabsMap.forEach((view, el) => {
      if (filePath === view.path) {
        // Here we add a 100ms delay as external editor (or the watcher itself)
        // seems like first trigger the change event then will keep lock the file
        // for small amount time.
        // This will sometimes cause readFileSync or readFile return empty content and no
        // error watched.
        setTimeout(() => {
          view.model.setValue(fs.readFileSync(filePath, 'utf8'))
        }, 100)
      }
    })
  })

  watcher.on('unlink', (filePath) => {
    console.log(filePath + 'removed')
    chromeTabsModule.tabsMap.forEach((view, el) => {
      if (filePath === view.path) {
        view.path = null
        el.children[2].children[1].style.color = '#f54336'
      }
    })
  })

  // Return watcher instance and utilities
  return {
    watcher: watcher,
    setLocalSave: (value) => { localSave = value; },
    getLocalSave: () => localSave
  }
}

module.exports = {
  initWatcher
}
