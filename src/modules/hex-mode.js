/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const path = require('path')
// Access global store object
const store = require('./store.js').init()

// Hex mode layout constants
const hmUnitCount = 16
const hmUnitBytes = 2
const hmUnitSpanLength = 1
const hmUnitLength = hmUnitBytes + hmUnitSpanLength // 3

const hmAddrOffset = 1
const hmAddrLength = 10
const hmHexOffset = hmAddrOffset + hmAddrLength // 11
const hmHexLength = hmUnitLength * hmUnitCount // 16 * 3 = 48
const hmSpanOffset = hmHexOffset + hmHexLength // 59
const hmSpanLength = 3
const hmStrOffset = hmSpanOffset + hmSpanLength // 62
const hmStrLength = 16
const hmEofOffset = hmStrOffset + hmStrLength // 78

// Export constants for external use
module.exports.constants = {
  hmUnitCount,
  hmUnitBytes,
  hmUnitSpanLength,
  hmUnitLength,
  hmAddrOffset,
  hmAddrLength,
  hmHexOffset,
  hmHexLength,
  hmSpanOffset,
  hmSpanLength,
  hmStrOffset,
  hmStrLength,
  hmEofOffset
}


/**
 * Calculate the paired range position for hex/string area synchronization
 * @param {object} range - Original range object
 * @returns {object} Paired range object
 */
function _getLinePairRange(range, monacoInst) {
  let s = range.startColumn
  if (s <= hmSpanOffset) {
    // hex area
    if (s < hmHexOffset) s = range.startColumn = hmHexOffset
    s = Math.round((s - hmHexOffset) / hmUnitLength) + hmStrOffset
  } else {
    // str area
    if (s < hmStrOffset) s = range.startColumn = hmStrOffset
    s = (s - hmStrOffset) * hmUnitLength + hmHexOffset
  }

  let e = range.endColumn
  if (e <= hmStrOffset) {
    // hex area
    if (e < hmHexOffset) e = range.endColumn = hmHexOffset
    if (e > hmSpanOffset) e = range.endColumn = hmSpanOffset
    e = Math.round((e - hmHexOffset) / hmUnitLength) + hmStrOffset
  } else {
    // str area
    if (e < hmStrOffset) e = range.endColumn = hmStrOffset
    e = (e - hmStrOffset) * hmUnitLength + hmHexOffset
  }

  return new monacoInst.Range(range.startLineNumber, s, range.startLineNumber, e)
}

/**
 * Show hex mode cursors with synchronized highlighting
 * @param {object} model - Editor model
 * @param {object} range - Selection range
 */
function _showCursors(model, range, monacoInst) {
  let cordRange = _getLinePairRange(range, monacoInst)
  if (undefined === cordRange) return

  // first remove old decos
  let decos = model.getLineDecorations(range.startLineNumber)
  for (let deco of decos) {
    if (deco.options.className === 'hex-cursor') {
      model.deltaDecorations([deco.id], [])
    }
  }

  model.deltaDecorations(
    [],
    [
      {
        range: range,
        options: {
          className: 'hex-cursor',
          zIndex: 999,
        },
      },
      {
        range: cordRange,
        options: {
          className: 'hex-cursor',
          zIndex: 999,
          overviewRuler: {
            color: '#f06292',
            position: 4, // 2: center, 4: right, 1: left, 7: full
          },
        },
      },
    ]
  )
}

/**
 * Handle hex mode selection ranges with decorations
 * @param {object} model - Editor model
 * @param {object} range - Selection range
 * @param {object} pairRange - Paired range
 * @param {object} decoration - Decoration style
 */
function _selectRanges(model, range, pairRange, decoration) {
  // first remove old decos
  let decos = model.getLineDecorations(range.startLineNumber)
  let zIndex = 1
  for (let deco of decos) {
    if (deco.options.className !== null && deco.options.className.indexOf('hl-') !== -1) {
      if (deco.options.zIndex >= zIndex) zIndex = deco.options.zIndex + 1
    }
  }

  // then apply new decos
  model.deltaDecorations(
    [],
    [
      {
        range: range,
        options: {
          className: decoration.style,
          zIndex: zIndex,
        },
      },
      {
        range: pairRange,
        options: {
          className: decoration.style,
          zIndex: zIndex,
          overviewRuler: {
            color: decoration.color,
            position: 4, // 2: center, 4: right, 1: left, 7: full
          },
        },
      },
    ]
  )
}

/**
 * Extract line range for hex mode processing
 * @param {object} range - Original range
 * @param {number} line - Line number
 * @returns {object} Extracted range
 */
function _extractLineRange(range, line, monacoInst) {
  let s = 1
  let e = 1

  if (line === range.startLineNumber) {
    s = range.startColumn
    if (s <= hmSpanOffset) {
      // hex area
      if (range.startLineNumber !== range.endLineNumber) e = hmSpanOffset
      else e = range.endColumn
    } else {
      // str area
      if (range.startLineNumber !== range.endLineNumber) e = hmEofOffset
      else e = range.endColumn
    }
  } else if (line === range.endLineNumber) {
    e = range.endColumn
    if (e <= hmStrOffset) {
      // hex area
      if (range.startLineNumber !== range.endLineNumber) s = hmHexOffset
      else s = range.startColumn
    } else {
      // str area
      if (range.startLineNumber !== range.endLineNumber) s = hmStrOffset
      else s = range.startColumn > hmStrOffset ? range.startColumn : hmStrOffset
    }
  } else {
    // default hex area
    s = hmHexOffset
    e = hmSpanOffset
  }

  return new monacoInst.Range(line, s, line, e)
}


/**
 * Initialize hex mode event handlers
 * @param {object} editorInst - Editor instance
 * @param {object} monacoInst - Monaco editor instance
 * @param {object} hlt - Highlight module
 */
function initHexModeHandlers(editorInst, monacoInst, hlt) {

  editorInst.onMouseUp(() => {
    // Add defensive check for store
    if (!store || typeof store.get !== 'function') {
      console.warn('hex-mode: store not available yet');
      return;
    }
    if (false === store.get('general.hexmode')) return

    let model = editorInst.getModel()
    let range = editorInst.getSelection()
    console.log('In: ' + range)

    if (range.isEmpty() === true) {
      _showCursors(model, range, monacoInst)
    } else {
      let deco = hlt.decoGet()
      for (let line = range.startLineNumber; line <= range.endLineNumber; line++) {
        let lineRange = _extractLineRange(range, line, monacoInst)
        let linePairRange = _getLinePairRange(lineRange, monacoInst)
        _selectRanges(model, lineRange, linePairRange, deco)
      }
    }
  })
}

// Export all functions
module.exports = {
  initHexModeHandlers,
  constants: module.exports.constants
}
