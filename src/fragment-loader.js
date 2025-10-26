// fragment-loader.js
// Reusable function to synchronously load an HTML fragment into a placeholder
function loadFragment(placeholderId, fragmentFile) {
  let xhr = new XMLHttpRequest()
  xhr.open('GET', fragmentFile, false)
  xhr.send(null)
  if (xhr.status === 200) {
    let el = document.getElementById(placeholderId)
    if (el) el.outerHTML = xhr.responseText
  }
}

// Load fragments on DOMContentLoaded
window.addEventListener('DOMContentLoaded', function () {
  loadFragment('nav-area-placeholder', 'nav-area.html')
  const tabFragments = [
    { id: 'general-tab-placeholder', file: 'tabs_html/general-tab.html' },
    { id: 'transmit-tab-placeholder', file: 'tabs_html/transmit-tab.html' },
    { id: 'advance-tab-placeholder', file: 'tabs_html/advance-tab.html' },
    { id: 'fileops-tab-placeholder', file: 'tabs_html/fileops-tab.html' },
    { id: 'chart-tab-placeholder', file: 'tabs_html/chart-tab.html' },
    { id: 'about-tab-placeholder', file: 'tabs_html/about-tab.html' },
  ]
  tabFragments.forEach(function (tab) {
    loadFragment(tab.id, tab.file)
  })
  loadFragment('bar-area-placeholder', 'bar-area.html')
})
