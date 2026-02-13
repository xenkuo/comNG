const mcss = require('materialize-css')

function toast(text) {
  mcss.toast({ html: text, displayLength: 2000 })
  // alert(text);
}

module.exports = { toast }
