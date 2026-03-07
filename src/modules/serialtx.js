const { Grid, h } = require('gridjs')
const { transmitData } = require('./serialport.js')
const store = require('./store.js').init()

/**
 * Creates and manages the serial transmission table
 * @returns {Object} Table helper functions
 */
function createTxTable() {
  // Load table data from store or use default
  let tableData = store.get('transmit.messages') || [
    { content: 'reboot' },
    { content: 'updateFirmware{version: "v2.0"}' },
    { content: 'factoryReset' },
    { content: '100300000001874B' },
  ];

  // Convert to array format for Grid.js (includes index column)
  const getDataArray = () => tableData.map((item, index) => [index, item.content, null]);

  // Determine if dark theme is enabled
  const isDarkTheme = store.get('general.darkTheme');

  const grid = new Grid({
    search: true,
    resizable: true,
    fixedHeader: true,
    autoWidth: false,
    width: '100%',
    pagination: {
      limit: 4,
      summary: false
    },
    style: {
      th: {
        'background-color': isDarkTheme ? '#3c3c3c' : '#e2f2f1',
        color: isDarkTheme ? '#e8eaed' : '#000',
        'text-align': 'center',
        'font-size': '12px',
        margin: '3px',
        padding: '4px 1px'
      },
      td: {
        'text-align': 'center',
        color: isDarkTheme ? '#cccccc' : '#000'
      }

    },
    columns: [{
      name: '#', // Hidden index column
      hidden: true,
      formatter: (_, row) => row._index // Store the Grid.js row index
    }, {
      name: 'Message',
      sort: true,
      formatter: (cell, row) => {
        // Create editable input field
        return h('input', {
          type: 'text',
          value: cell,
          className: 'editable-content',
          onBlur: (e) => {
            // Use the Grid.js row index from the hidden column
            const rowIndex = row.cells[0].data; // _index column is at index 0
            if (rowIndex >= 0 && rowIndex < tableData.length) {
              tableData[rowIndex].content = e.target.value;
              // Sync to store only when user finishes editing
              store.set('transmit.messages', tableData);
              console.log('Table data updated:', tableData);
            }
          },
          style: {
            // width: '100%',
            // padding: '4px',
            // border: '1px solid #ddd',
            // borderRadius: '4px'
          }
        });
      }
    },
    {
      name: 'Send',
      width: '48px',
      formatter: (cell, row) => {
        return h('div', {
          style: {
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }
        }, [
          h('button', {
            className: 'btn-small waves-effect custom-tx-btn centered-action-btn',
            style: {
              margin: '0'
            },
            onClick: () => {
              // Use the Grid.js row index from the hidden column
              const rowIndex = row.cells[0].data; // _index column is at index 0
              const currentContent = rowIndex >= 0 && rowIndex < tableData.length ?
                tableData[rowIndex].content : cell;
              transmitData(currentContent);
            }
          }, [
            h('i', { className: 'material-icons' }, 'send')
          ])
        ]);
      }
    },
    {
      name: 'Delete',
      width: '48px',
      formatter: (cell, row) => {
        return h('div', {
          style: {
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }
        }, [
          h('button', {
            className: 'btn-small waves-effect custom-tx-btn centered-action-btn red',
            style: {
              margin: '0'
            },
            onClick: () => {
              // Use the Grid.js row index from the hidden column
              const rowIndex = row.cells[0].data; // _index column is at index 0
              if (rowIndex >= 0 && rowIndex < tableData.length) {
                removeRowByIndex(rowIndex);
              }
            }
          }, [
            h('i', { className: 'material-icons' }, 'delete')
          ])
        ]);
      }
    },],
    data: getDataArray()
  });

  // Render the grid
  const tableElement = document.getElementById('tx-table')
  grid.render(tableElement)

  // Store grid reference on the element for later access
  tableElement._grid = grid

  // Handle window resize to adjust grid width
  let resizeTimeout
  window.addEventListener('resize', () => {
    // Debounce resize events
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      // Force grid to recalculate its width using Grid.js API
      if (tableElement && tableElement._grid) {
        const gridInstance = tableElement._grid
        // Update the config to ensure 100% width
        gridInstance.updateConfig({ width: '100%' })
        // Force a re-render
        gridInstance.forceRender()
      }
    }, 250)
  })

  // Attach event handler to the static add button
  const addButton = document.getElementById('add-row-btn')
  if (addButton) {
    addButton.onclick = () => addRow('')
  }

  // Helper functions for dynamic row management
  function addRow(content = '') {
    const newId = Math.max(...tableData.map(item => item.id), 0) + 1;
    tableData.push({ id: newId, content: content });
    // Sync to store
    store.set('transmit.messages', tableData);
    grid.updateConfig({ data: getDataArray() }).forceRender();
  }

  function removeRowByIndex(index) {
    if (index >= 0 && index < tableData.length) {
      tableData.splice(index, 1);
      // Sync to store
      store.set('transmit.messages', tableData);
      grid.updateConfig({ data: getDataArray() }).forceRender();
    }
  }

  // Make these functions globally available for testing
  window.txTableHelpers = { addRow, removeRowByIndex };

  return { addRow, removeRow: removeRowByIndex, grid };
}

/**
 * Update Grid.js table theme based on dark theme setting
 * This function re-renders the table with updated styles
 */
function updateTxTableTheme() {
  // Get the grid instance if it exists
  const tableElement = document.getElementById('tx-table');
  if (!tableElement || !tableElement._grid) return;

  // Destroy the existing grid to ensure clean re-render
  const oldGrid = tableElement._grid;
  if (oldGrid && typeof oldGrid.destroy === 'function') {
    oldGrid.destroy();
  }

  // Clear the table element content
  tableElement.innerHTML = '';
  tableElement._grid = null;

  // Small delay to ensure DOM is ready
  setTimeout(() => {
    // Re-create the table with new theme
    // Note: Grid.js doesn't support dynamic theme switching, so we need to re-render
    createTxTable();
  }, 50);
}

module.exports = { createTxTable, updateTxTableTheme }
