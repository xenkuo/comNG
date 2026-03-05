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
document.addEventListener('DOMContentLoaded', function () {
  loadFragment('nav-area-placeholder', 'html_modules/nav-area.html')
  const tabFragments = [
    { id: 'general-tab-placeholder', file: 'html_modules/tabs_html/general-tab.html' },
    { id: 'transmit-tab-placeholder', file: 'html_modules/tabs_html/transmit-tab.html' },
    { id: 'advance-tab-placeholder', file: 'html_modules/tabs_html/advance-tab.html' },
    { id: 'fileops-tab-placeholder', file: 'html_modules/tabs_html/fileops-tab.html' },
    { id: 'chart-tab-placeholder', file: 'html_modules/tabs_html/chart-tab.html' },
    { id: 'about-tab-placeholder', file: 'html_modules/tabs_html/about-tab.html' },
  ]
  tabFragments.forEach(function (tab) {
    loadFragment(tab.id, tab.file)
  })
  loadFragment('bar-area-placeholder', 'html_modules/bar-area.html')
})
