/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const ChromeTabs = require('chrome-tabs')
const monacoUtilities = require('./monaco-utilities.js')
const { navi_layout_update } = require('./utilities.js')

// ChromeTabs instance
let chromeTabs = new ChromeTabs()
let tabsMap = new Map()
let watcher
let monacoInst
let editorInst

/**
 * Initialize ChromeTabs module with required dependencies
 * @param {object} deps - Dependencies object containing monacox, editorInst, and watcher
 */
function initChromeTabs(deps) {
  monacoInst = deps.monacox
  editorInst = deps.editorInst
  watcher = deps.watcher

  // Initialize ChromeTabs
  const tabsEl = document.getElementById('tabs-area')
  chromeTabs.init(tabsEl)

  // Setup event listeners
  _setupEventListeners(tabsEl)

  // Add initial tab
  chromeTabs.addTab()

  // Setup tab add button click handler
  document.getElementById('tab-add-btn').onclick = () => {
    chromeTabs.addTab()
  }

  // Return the instances for direct access
  return {
    chromeTabs: chromeTabs,
    tabsMap: tabsMap
  }
}

/**
 * Setup all ChromeTabs event listeners
 * @param {HTMLElement} tabsEl - Tabs container element
 */
function _setupEventListeners(tabsEl) {
  tabsEl.addEventListener('tabAdd', ({ detail }) => {
    _handleTabAdd(detail)
  })

  tabsEl.addEventListener('activeTabChange', ({ detail }) => {
    _handleActiveTabChange(detail)
  })

  tabsEl.addEventListener('tabRemove', ({ detail }) => {
    _handleTabRemove(detail)
  })
}

/**
 * Handle new tab creation
 * @param {object} detail - Event detail containing tabEl
 */
function _handleTabAdd(detail) {
  navi_layout_update()

  let el = detail.tabEl
  // setup the title with time
  let title = monacoUtilities.generateFileName()
  let titleEl = el.querySelector('.chrome-tab-title')
  el.align = 'center'
  titleEl.innerHTML = title

  // create a new model
  let model = monacoInst.editor.createModel()
  editorInst.setModel(model)
  monacoInst.editor.setModelLanguage(model, 'comNGLang')

  // setup content change listener for model
  model.onDidChangeContent((e) => {
    if (e.isFlush === true) return
    el.children[2].children[1].style.color = '#26a69a'
  })

  // setup the map between tab and model/state
  let view = {
    model: model,
    path: null,
    state: null,
  }
  tabsMap.set(el, view)
}

/**
 * Handle active tab change
 * @param {object} detail - Event detail containing tabEl
 */
function _handleActiveTabChange(detail) {
  let el = detail.tabEl

  // Save before tab's state
  let model = editorInst.getModel()
  tabsMap.forEach((view, _) => {
    if (model === view.model) {
      view.state = editorInst.saveViewState()
    }
  })

  // Restore new tab's state
  let view = tabsMap.get(el)
  editorInst.setModel(view.model)
  editorInst.restoreViewState(view.state)
}

/**
 * Handle tab removal
 * @param {object} detail - Event detail containing tabEl
 */
function _handleTabRemove(detail) {
  navi_layout_update()

  // delete from watcher
  const view = tabsMap.get(detail.tabEl)
  if (null !== view.path) {
    watcher.unwatch(view.path)
  }

  // delete from tabsMap
  tabsMap.delete(detail.tabEl)
  if (0 === tabsMap.size) chromeTabs.addTab()
}

/**
 * Create a new tab
 */
function newTab() {
  chromeTabs.addTab()
}

/**
 * Switch to a specific tab by index
 * @param {number} tabIndex - Tab index (1-based)
 */
function switchTab(tabIndex) {
  const elParent = chromeTabs.el.children[0]

  if (tabIndex > elParent.childElementCount) return
  const el = elParent.children[tabIndex - 1]
  chromeTabs.setCurrentTab(el)
}

// Export all functions and getters
module.exports = {
  initChromeTabs,
  newTab,
  switchTab,
  // Direct access to instances
  get chromeTabs() { return chromeTabs; },
  get tabsMap() { return tabsMap; }
}
