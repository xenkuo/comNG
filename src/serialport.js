/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const serial = require('serialport')

var port

function portUpdate () {
  let pSelect = document.getElementById('path-select')
  pSelect.options.length = 0

  serial
    .list()
    .then(ports => {
      ports.forEach((item, index) => {
        console.log(item, index)
        pSelect.options.add(new Option(item.path, index))
        if (index === config.pathIndex) pSelect.selectedIndex = index
      })
      M.FormSelect.init(pSelect)
    })
    .catch(err => {
      console.error(err)
    })
}

function serialGetOptions () {
  let options = {}

  let baudRate = parseInt(
    document.getElementById('baud-select').options[config.baudIndex].text
  )
  if (isNaN(baudRate) === true) baudRate = 115200
  options.baudRate = baudRate

  let dataBits = parseInt(
    document.getElementById('databits-select').options[
      config.general.databitsIndex
    ].text
  )
  if (isNaN(dataBits) === true) dataBits = 8
  options.dataBits = dataBits

  let parity = document.getElementById('parity-select').options[
    config.general.parityIndex
  ].text
  options.parity = parity

  let stopBits = parseInt(
    document.getElementById('stopbits-select').options[
      config.general.stopbitsIndex
    ].text
  )
  if (isNaN(stopBits) === true) stopBits = 1
  options.stopBits = stopBits

  options.autoOpen = true

  return options
}

function serialGetSetOptions () {
  let setOptions = {
    // brk: false,    // use system default
    // cts: false,    // use system default
    // dsr: false,    // use system default
    // dtr: true,     // use system default
    // rts: true // required for certain board
  }

  return setOptions
}

function toast (text) {
  M.toast({ html: text })
  // alert(text)
}

function serialClose () {
  port === undefined ? null : port.close()
}

function serialWrite (data) {
  if (port === undefined || port.isOpen === false) {
    toast('Error: No port opened, cannot write')
    if (txRepeatTimer !== undefined) clearInterval(txRepeatTimer)
    return false
  }

  port.write(data)
  return true
}

document.getElementById('port-switch').onclick = e => {
  if (e.target.checked === true) {
    let pathSelect = document.getElementById('path-select')
    let portPath = pathSelect.options[pathSelect.selectedIndex].label

    let baudSelect = document.getElementById('baud-select')
    let portBaud = baudSelect.options[baudSelect.selectedIndex].label
    port = new serial(portPath, serialGetOptions())

    port.on('open', () => {
      console.log('port open event')
      port.set(serialGetSetOptions(), err => {
        if (err !== null) console.error(err)
      })
    })

    port.on('error', err => {
      toast(err.message)
      document.getElementById('port-switch').checked = false
      if (txRepeatTimer !== undefined) clearInterval(txRepeatTimer)
    })

    port.on('close', err => {
      console.log('port close event')
      if (err !== null) console.error(err)
      document.getElementById('port-switch').checked = false
      if (txRepeatTimer !== undefined) clearInterval(txRepeatTimer)
    })

    port.on('drain', () => {
      toast('Error: Write failed, please try again')
    })

    port.on('data', showBuff)
  } else {
    if (port === undefined || port.isOpen === false) {
      document.getElementById('port-switch').checked = false
    } else {
      port.close()
    }
  }
}
