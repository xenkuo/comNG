const Tabulator = require('tabulator-tables')
const { transmitData } = require('./serialport.js')
const store = require('./store.js').init()

console.log('Tabulator loaded:', typeof Tabulator)

/**
 * @typedef {{
 *   redraw: (force?: boolean) => void,
 *   getData: () => Array<Record<string, any>>,
 *   addRow: (data: Record<string, any>, addAtBottom?: boolean | number) => void,
 *   clearFilter: () => void,
 *   setFilter: (field: string, type: string, value: string) => void,
 *   getRow: (id: string | number) => any
 * }} TabulatorInstance
 */

// Helper to sync theme classes
function syncTableTheme(tableElement) {
  if (!tableElement) return
  const isDark = store.get('general.darkTheme')
  tableElement.classList.toggle('light-mode-override', !isDark)
}

/**
 * Creates and manages the serial transmission table using Tabulator
 * @returns {Object} Table helper functions
 */
function createTxTable() {
  console.log('createTxTable called')

  // Load table data from store or use default
  let tableData = store.get('transmit.messages') || [
    { id: 1, content: 'reboot' },
    { id: 2, content: 'updateFirmware{version: "v2.0"}' },
    { id: 3, content: 'factoryReset' },
    { id: 4, content: '100300000001874B' },
  ]

  // Ensure all items have unique IDs
  let maxId = Math.max(...tableData.map((item) => item.id || 0), 0)
  tableData = tableData.map((item) => ({
    id: item.id || ++maxId,
    content: item.content || '',
  }))

  console.log('Table data loaded:', tableData.length, 'rows')

  const tableElement = document.getElementById('tx-table')
  if (!tableElement) {
    console.error('Table element "#tx-table" not found.')
    return { addRow: () => {}, removeRow: () => {} }
  }

  // Clear any existing content
  tableElement.innerHTML = ''

  // Enforce container height explicitly to prevent Virtual DOM collapse
  tableElement.style.height = '240px'

  // 1. SYNC THEME BEFORE INITIALIZATION
  // This prevents row layout collapses or flashing colors during first bootup
  syncTableTheme(tableElement)

  // Create Tabulator instance
  console.log('Initializing Tabulator...')
  /** @type {TabulatorInstance | null} */
  let table = null
  try {
    table = new Tabulator('#tx-table', {
      data: tableData,
      layout: 'fitColumns',
      height: '240px',
      pagination: true, // Enables pagination
      paginationSize: 50, // Default page size
      // progressiveRenderSize: 50, // <-- CRITICAL FIX: REMOVED (Conflicts with pagination)
      movableRows: false,
      selectable: false,
      headerSort: false,
      resizableColumns: false,
      clipboard: false,
      placeholder: 'No messages yet',
      headerSortTristate: false,
      columns: [
        {
          title: 'Message',
          field: 'content',
          editor: 'input',
          editorParams: {
            elementAttributes: {
              class: 'editable-content',
            },
          },
          validator: 'required',
          cellEdited: (cell) => {
            // Update store when cell is edited
            const data = table.getData()
            store.set('transmit.messages', data)
            console.log('Cell edited:', cell.getField(), cell.getValue())
          },
        },
        {
          title: 'Send',
          width: 80,
          hozAlign: 'center',
          headerSort: false,
          // Use string formatter for performance
          formatter: () =>
            '<button class="btn-small waves-effect custom-tx-btn centered-action-btn" style="margin:0;"><i class="material-icons">send</i></button>',
          cellClick: (e, cell) => {
            e.stopPropagation() // Prevent row selection if enabled
            const rowData = cell.getRow().getData()
            transmitData(rowData.content)
          },
        },
        {
          title: 'Delete',
          width: 80,
          hozAlign: 'center',
          headerSort: false,
          // Use string formatter for performance
          formatter: () =>
            '<button class="btn-small waves-effect custom-tx-btn centered-action-btn red" style="margin:0;"><i class="material-icons">delete</i></button>',
          cellClick: (e, cell) => {
            e.stopPropagation()
            cell.getRow().delete()
            const data = table.getData()
            store.set('transmit.messages', data)
          },
        },
      ],
    })

    // Store the active instance to the DOM element for external layout tracking
    tableElement.__tabulator = table

    // Force a swift internal redraw to settle virtual height metrics against the applied DOM skin
    requestAnimationFrame(() => {
      if (table && typeof table.redraw === 'function') {
        table.redraw(true)
      }
    })

    console.log('Tabulator initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Tabulator:', error)
    return { addRow: () => {}, removeRow: () => {} }
  }

  // Setup search functionality
  const searchInput = document.getElementById('tx-search-input')
  if (searchInput && !searchInput.dataset.txBound) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase()
      if (term) {
        table.setFilter('content', 'like', term)
      } else {
        table.clearFilter()
      }
    })
    searchInput.dataset.txBound = 'true'
  }

  // Helper functions
  function addRow(content = '') {
    maxId++
    table.addRow({ id: maxId, content: content }, false) // false = add at bottom
    const data = table.getData()
    store.set('transmit.messages', data)

    // Clear search when adding
    if (searchInput) {
      searchInput.value = ''
      table.clearFilter()
    }
  }

  function removeRow(id) {
    const row = table.getRow(id)
    if (row) {
      row.delete()
      const data = table.getData()
      store.set('transmit.messages', data)
    }
  }

  // Attach event handler to the static add button
  const addButton = document.getElementById('add-row-btn')
  if (addButton) {
    addButton.onclick = () => addRow('')
  }

  // Make these functions globally available
  window.txTableHelpers = { addRow, removeRow }

  return { addRow, removeRow, table }
}

// THE FIX: Trigger a Sort Event to force rows to reappear after theme change
function updateTxTableTheme() {
  const tableElement = document.getElementById('tx-table')
  if (!tableElement) return

  syncTableTheme(tableElement)

  const table = tableElement.__tabulator
  if (table) {
    // Forcing a sort on the hidden ID column rebuilds the row DOM
    table.setSort('id', 'asc')
  }
}

module.exports = { createTxTable, updateTxTableTheme }
