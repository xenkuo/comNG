/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const ChromeTabs = require('chrome-tabs')
const { generateFileName } = require('./utilities.js')
const { navi_layout_update } = require('./utilities.js')
const store = require('./store.js').init()

// ChromeTabs instance
let chromeTabs = new ChromeTabs()
let tabsMap = new Map()

/**
 * Initialize ChromeTabs module with required dependencies
 */
function initChromeTabs() {

  // Initialize ChromeTabs
  const tabsEl = document.getElementById('tabs-area')
  chromeTabs.init(tabsEl)

  // Apply dark theme if enabled
  if (store.get('general.darkTheme')) {
    tabsEl.classList.add('chrome-tabs-dark-theme')
  }

  // Setup event listeners
  _setupEventListeners(tabsEl)

  // Add initial tab immediately for better UX (without animation)
  chromeTabs.addTab(undefined, { animate: false })

  // Setup tab add button click handler
  document.getElementById('tab-add-btn').onclick = () => {
    chromeTabs.addTab()
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
  let title = generateFileName()
  let titleEl = el.querySelector('.chrome-tab-title')
  el.align = 'center'
  titleEl.innerHTML = title

  // Dispatch custom event for tab addition
  const event = new CustomEvent('tabAdded', { detail: { tabEl: el } });
  document.dispatchEvent(event);
}

/**
 * Handle active tab change
 * @param {object} detail - Event detail containing tabEl
 */
function _handleActiveTabChange(detail) {
  let el = detail.tabEl

  // Dispatch custom event for active tab changed
  const event = new CustomEvent('activeTabChanged', { detail: { tabEl: el } });
  document.dispatchEvent(event);
}

/**
 * Handle tab removal
 * @param {object} detail - Event detail containing tabEl
 */
function _handleTabRemove(detail) {
  navi_layout_update()

  // Dispatch custom event for tab removal
  let el = detail.tabEl

  const event = new CustomEvent('tabRemoved', { detail: { tabEl: el } });
  document.dispatchEvent(event);
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

/**
 * Update chrome-tabs theme based on dark theme setting
 * @param {boolean} isDark - Whether dark theme is enabled
 */
function updateChromeTabsTheme(isDark) {
  const tabsEl = document.getElementById('tabs-area')
  if (!tabsEl) return

  if (isDark) {
    tabsEl.classList.add('chrome-tabs-dark-theme')
  } else {
    tabsEl.classList.remove('chrome-tabs-dark-theme')
  }
}

// Export all functions and getters
module.exports = {
  initChromeTabs,
  newTab,
  switchTab,
  updateChromeTabsTheme,
  // Direct access to instances
  get chromeTabs() { return chromeTabs; },
  get tabsMap() { return tabsMap; }
}
