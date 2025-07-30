// fragment-loader.js
// Reusable function to synchronously load an HTML fragment into a placeholder
function loadFragment(placeholderId, fragmentFile) {
  var xhr = new XMLHttpRequest()
  xhr.open('GET', fragmentFile, false)
  xhr.send(null)
  if (xhr.status === 200) {
    var el = document.getElementById(placeholderId)
    if (el) el.outerHTML = xhr.responseText
  }
}

// Load fragments on DOMContentLoaded
window.addEventListener('DOMContentLoaded', function () {
  loadFragment('nav-area-placeholder', 'nav-area.html')
  const tabFragments = [
    { id: 'general-tab-placeholder', file: 'tabs/general-tab.html' },
    { id: 'transmit-tab-placeholder', file: 'tabs/transmit-tab.html' },
    { id: 'advance-tab-placeholder', file: 'tabs/advance-tab.html' },
    { id: 'fileops-tab-placeholder', file: 'tabs/fileops-tab.html' },
    { id: 'chart-tab-placeholder', file: 'tabs/chart-tab.html' },
    { id: 'about-tab-placeholder', file: 'tabs/about-tab.html' },
  ]
  tabFragments.forEach(function (tab) {
    loadFragment(tab.id, tab.file)
  })
  loadFragment('bar-area-placeholder', 'bar-area.html')
})
