const mcss = require('materialize-css')

function toast(text) {
  mcss.toast({ html: text, displayLength: 2000 })
  // alert(text);
}

let _tabsOffset
let _tabStdWidth
let _dragMinWidth

function navi_layout_init(tabsOffset, tabStdWidth, dragAreaWidth) {
  _tabsOffset = tabsOffset
  _tabStdWidth = tabStdWidth
  _dragMinWidth = dragAreaWidth
}

function navi_layout_update() {
  const windowWidth = window.innerWidth
  const logoEl = document.getElementById('logo')
  const logoWidth = parseInt(logoEl.style.width) | logoEl.offsetWidth
  const tabsAreaEl = document.getElementById('tabs-area')
  const tabAddBtnEl = document.getElementById('tab-add-btn')
  const dragAreaEl = document.getElementById('drag-area')
  const tabsMaxWidth = windowWidth - _dragMinWidth - logoWidth - _tabsOffset

  const els = document.getElementsByClassName('chrome-tab')
  let tabsAreaWidth = els.length * _tabStdWidth
  if (tabsAreaWidth > tabsMaxWidth) tabsAreaWidth = tabsMaxWidth

  tabsAreaEl.style.width = tabsAreaWidth + 'px'
  tabAddBtnEl.style.left = _tabsOffset + tabsAreaWidth + 'px'
  dragAreaEl.style.width =
    windowWidth -
    tabsAreaWidth -
    _tabsOffset -
    (parseInt(tabAddBtnEl.style.width) | tabAddBtnEl.offsetWidth) +
    'px'
}

function generateFileName() {
  let date = new Date()
  date = date.toString().split(' ')
  let name = date[0] + '-' + date[4].replace(/[.|:]/g, '-') + '.log'

  return name
}

function getFormattedTimestamp() {
  const t = new Date()

  return (
    t.toLocaleTimeString().split(' ')[0] + ':' + t.getMilliseconds().toString().padStart(3, 0) + ' '
  )
}

module.exports = {
  navi_layout_init,
  navi_layout_update,
  generateFileName,
  getFormattedTimestamp,
  toast
}
