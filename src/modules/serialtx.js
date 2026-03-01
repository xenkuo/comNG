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
    { id: 2, content: 'updateFirmware{version: "v2.0"}' }
  ];

  // Convert to array format for Grid.js
  const getDataArray = () => tableData.map(item => [item.id, item.content, null]);

  const grid = new Grid({
    search: true,
    sort: true,
    resizable: true,
    fixedHeader: true,
    autoWidth: true,
    // height: '100px',
    pagination: {
      limit: 2,
      summary: false
    },
    columns: [{
      name: 'Index',
      minWidth: '30px',
      sort: false,
      formatter: (cell) => {
        // Return the explicit ID stored with each row, styled as bold and centered
        return h('div', {
          className: 'bold-centered-index',
          style: {
            fontWeight: 'bold',
            textAlign: 'center',
            width: '100%'
          }
        }, cell);
      }
    }, {
      name: 'Content',
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
      name: 'Actions',
      minWidth: '100px',
      sort: false,
      formatter: (cell, row) => {
        return h('div', {
          style: {
            display: 'flex',
            width: '100%',
            position: 'relative'
          }
        }, [
          h('button', {
            className: 'btn-small waves-effect custom-tx-btn centered-action-btn',
            style: {
              position: 'absolute',
              left: '30%',
              transform: 'translateX(-50%)',
              margin: '0'
            },
            onClick: () => transmitData(row.cells[1].data)
          }, [
            h('i', { className: 'material-icons' }, 'send')
          ]),
          h('button', {
            className: 'btn-small waves-effect custom-tx-btn centered-action-btn red',
            style: {
              position: 'absolute',
              right: '0',
              margin: '0'
            },
            onClick: () => removeRow(row.cells[0].data)
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

  function removeRow(id) {
    tableData = tableData.filter(item => item.id !== id);
    grid.updateConfig({ data: getDataArray() }).forceRender();
  }

  // Make these functions globally available for testing
  window.txTableHelpers = { addRow, removeRow };

  return { addRow, removeRow, grid };
}

module.exports = { createTxTable }
