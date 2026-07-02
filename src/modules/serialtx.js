const Tabulator = require('tabulator-tables')
const { transmitData } = require('./serialport.js')
const store = require('./store.js').init()

console.log('Tabulator loaded:', typeof Tabulator)

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
  tableData = tableData.map((item, idx) => ({
    id: item.id || ++maxId,
    content: item.content || '',
  }))

  console.log('Table data loaded:', tableData.length, 'rows')

  const tableElement = document.getElementById('tx-table')
  console.log('Table element found:', !!tableElement)
  if (!tableElement) {
    console.error('tx-table element not found! Retrying in 500ms...')
    // Retry after a delay if element not found
    // setTimeout(() => createTxTable(), 500)
    // return { addRow: () => {}, removeRow: () => {} }
  }

  // Clear any existing content
  tableElement.innerHTML = ''

  // Ensure the table element has proper dimensions
  console.log('Table element dimensions:', tableElement.offsetWidth, 'x', tableElement.offsetHeight)

  // Determine if dark theme is enabled
  const isDarkTheme = store.get('general.darkTheme')

  // Create Tabulator instance
  console.log('Initializing Tabulator...')
  let table
  try {
    table = new Tabulator('#tx-table', {
      data: tableData,
      layout: 'fitColumns',
      height: '240px', // Use auto height instead of 100%
      pagination: true,
      movableRows: false,
      selectable: false,
      headerSort: false,
      resizableColumns: false,
      progressiveRenderSize: 50,
      clipboard: false,
      placeholder: 'No messages yet',
      options: {
        rowHeight: 34,
      },
      rowFormatter: (row) => {
        const element = row.getElement()
        element.style.border = 'none'
        element.style.boxShadow = 'none'
      },
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
          formatter: (cell, formatterParams, onRendered) => {
            const container = document.createElement('div')
            container.style.textAlign = 'center'

            const btn = document.createElement('button')
            btn.className = 'btn-small waves-effect custom-tx-btn centered-action-btn'
            btn.style.margin = '0'
            btn.innerHTML = '<i class="material-icons">send</i>'

            btn.onclick = () => {
              const rowData = cell.getRow().getData()
              transmitData(rowData.content)
            }

            container.appendChild(btn)
            return container
          },
        },
        {
          title: 'Delete',
          width: 80,
          hozAlign: 'center',
          formatter: (cell, formatterParams, onRendered) => {
            const container = document.createElement('div')
            container.style.textAlign = 'center'

            const btn = document.createElement('button')
            btn.className = 'btn-small waves-effect custom-tx-btn centered-action-btn red'
            btn.style.margin = '0'
            btn.innerHTML = '<i class="material-icons">delete</i>'

            btn.onclick = () => {
              const row = cell.getRow()
              row.delete()
              const data = table.getData()
              store.set('transmit.messages', data)
            }

            container.appendChild(btn)
            return container
          },
        },
      ],
    })

    console.log('Tabulator initialized successfully')
    console.log('Table element after init:', tableElement.innerHTML.substring(0, 100))
  } catch (error) {
    console.error('Failed to initialize Tabulator:', error)
    return { addRow: () => {}, removeRow: () => {} }
  }

  // Setup search functionality
  const searchContainer = document.createElement('div')
  searchContainer.style.cssText = 'display: flex; justify-content: flex-start;'

  // Apply a consistent, borderless appearance to the Tabulator table after it renders
  setTimeout(() => {
    const tableWrapper = document.querySelector('#tx-table .tabulator')
    if (tableWrapper) {
      tableWrapper.style.border = 'none'
      tableWrapper.style.boxShadow = 'none'
      const header = tableWrapper.querySelector('.tabulator-header')
      if (header) {
        header.style.border = 'none'
        header.style.boxShadow = 'none'
      }
      const rows = tableWrapper.querySelectorAll('.tabulator-row')
      rows.forEach((row) => {
        row.style.border = 'none'
        row.style.boxShadow = 'none'
      })
      const cells = tableWrapper.querySelectorAll('.tabulator-cell')
      cells.forEach((cell) => {
        cell.style.border = 'none'
      })
    }
  }, 0)
  searchContainer.innerHTML = `
    <input type="text" 
           id="tx-search-input"
           placeholder="Search messages..." 
           style="width: 50%; margin: 10px 0 10px 0; padding-left: 4px; border: 1px solid ${isDarkTheme ? '#3e3e42' : '#ddd'}; border-radius: 4px; background: ${isDarkTheme ? '#3c3c3c' : '#fff'}; color: ${isDarkTheme ? '#cccccc' : '#000'};"
    />
  `

  // Insert search box before table
  tableElement.parentElement.insertBefore(searchContainer, tableElement)

  const searchInput = document.getElementById('tx-search-input')
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase()
    if (term) {
      table.setFilter('content', 'like', term)
    } else {
      table.clearFilter()
    }
  })

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

/**
 * Update table theme based on dark theme setting
 */
function updateTxTableTheme() {
  // Simply re-create the table with new theme
  createTxTable()
}

module.exports = { createTxTable, updateTxTableTheme }
