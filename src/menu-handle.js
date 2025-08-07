const menuInfo = { height: 0 }

function dragElement(elmnt) {
  var offsetX = 0,
    offsetY = 0,
    currentX = 0,
    currentY = 0

  // otherwise, move the DIV from anywhere inside the DIV:
  elmnt.onmousedown = dragMouseDown

  function dragMouseDown(e) {
    e = e || window.event
    e.preventDefault()
    // get the mouse cursor position at startup:
    currentX = e.clientX
    currentY = e.clientY
    document.onmouseup = closeDragElement
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag
  }

  function elementDrag(e) {
    e = e || window.event
    e.preventDefault()
    // calculate the new cursor position:
    offsetX = currentX - e.clientX
    offsetY = currentY - e.clientY
    currentX = e.clientX
    currentY = e.clientY

    // set the element's new position:
    // elmnt.style.top = elmnt.offsetTop - offsetY + 'px'
    // elmnt.style.left = elmnt.offsetLeft - offsetX + 'px'

    let menuEl = document.getElementById('menu-area')
    let editorEl = document.getElementById('editor-area')

    menuEl.style.height = menuEl.offsetHeight + offsetY + 'px'
    editorEl.style.height = editorEl.offsetHeight - offsetY + 'px'

    menuInfo.height = parseInt(menuEl.style.height)
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null
    document.onmousemove = null
    // Dispatch custom event for layout adjustment
    const event = new CustomEvent('menuResized', { detail: { height: menuInfo.height } })
    window.dispatchEvent(event)
  }
}

function initMenuHandle() {
  dragElement(document.getElementById('menu-handle'))
}

module.exports = {
  initMenuHandle,
  menuInfo,
}
