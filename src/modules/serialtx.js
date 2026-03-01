const { Grid, h } = require('gridjs')
const { transmitData } = require('./serialport.js')

/**
 * Creates and manages the serial transmission table
 * @returns {Object} Table helper functions
 */
function createTxTable() {
  // Sample data with explicit IDs for dynamic management
  let tableData = [
    { id: 1, content: 'reboot' },
    { id: 2, content: 'updateFirmware{version: "v2.0"}' },
    { id: 3, content: 'factoryReset' },
    { id: 4, content: 'factoryReset' },
  ];

  // Convert to array format for Grid.js
  const getDataArray = () => tableData.map(item => [item.content, null]);

  const grid = new Grid({
    search: true,
    sort: true,
    resizable: true,
    fixedHeader: true,
    autoWidth: true,
    // height: '100px',
    pagination: {
      limit: 4,
      summary: false
    },
    columns: [{
      name: 'Message',
      sort: false,
      formatter: (cell, row) => {
        // Create editable input field
        return h('input', {
          type: 'text',
          value: cell,
          className: 'editable-content',
          onInput: (e) => {
            // Update the data when input changes
            const rowIndex = row.index || tableData.findIndex(item => item.id === row.cells[0].data);
            if (rowIndex >= 0) {
              tableData[rowIndex].content = e.target.value;
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
      sort: false,
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
            onClick: () => transmitData(row.cells[0].data)
          }, [
            h('i', { className: 'material-icons' }, 'send')
          ])
        ]);
      }
    },
    {
      name: 'Delete',
      width: '48px',
      sort: false,
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
              // Get the content from the same row to identify which item to remove
              const contentToDelete = row.cells[0].data;
              const indexToRemove = tableData.findIndex(item => item.content === contentToDelete);

              if (indexToRemove !== -1) {
                removeRowByIndex(indexToRemove);
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

  // Attach event handler to the static add button
  const addButton = document.getElementById('add-row-btn')
  if (addButton) {
    addButton.onclick = () => addRow('')
  }

  // Helper functions for dynamic row management
  function addRow(content = '') {
    const newId = Math.max(...tableData.map(item => item.id), 0) + 1;
    tableData.push({ id: newId, content: content });
    grid.updateConfig({ data: getDataArray() }).forceRender();
  }

  function removeRowByIndex(index) {
    if (index >= 0 && index < tableData.length) {
      tableData.splice(index, 1);
      grid.updateConfig({ data: getDataArray() }).forceRender();
    }
  }

  // Make these functions globally available for testing
  window.txTableHelpers = { addRow, removeRowByIndex };

  return { addRow, removeRow: removeRowByIndex, grid };
}

module.exports = { createTxTable }
