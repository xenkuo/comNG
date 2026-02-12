/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const serial = require('serialport')
const { chartFrameProcess } = require('./modules/chart.js')

let port, modemSignalTimer
let modemSignal = {
  cts: false,
  dsr: false,
  dcd: false,
}

function portUpdate() {
  let pSelect = document.getElementById('path-select')
  pSelect.options.length = 0

  serial
    .list()
    .then((ports) => {
      ports.forEach((item, index) => {
        // console.log(item, index);
        pSelect.options.add(new Option(item.path + ' ' + item.manufacturer, index))
        if (index === store.get('pathIndex')) pSelect.selectedIndex = index
      })
      mcss.FormSelect.init(pSelect)
    })
    .catch((e) => {
      console.error(e)
    })
}

function modemSignalTimerHandle() {
  if (port === undefined || port.isOpen === false) return clearInterval(modemSignalTimer)

  port.get((e, signal) => {
    if (e) return console.error(e)

    if (signal.cts !== modemSignal.cts) {
      modemSignal.cts = signal.cts
      if (signal.cts === false) {
        document.getElementById('cts-btn').style.cssText = 'background-color: #dfdfdf !important'
      } else {
        document.getElementById('cts-btn').style.cssText = 'background-color: #26a69a !important'
      }
    }
    if (signal.dsr !== modemSignal.dsr) {
      modemSignal.dsr = signal.dsr
      if (signal.dsr === false) {
        document.getElementById('dsr-btn').style.cssText = 'background-color: #dfdfdf !important'
      } else {
        document.getElementById('dsr-btn').style.cssText = 'background-color: #26a69a !important'
      }
    }
    if (signal.dcd !== modemSignal.dcd) {
      modemSignal.dcd = signal.dcd
      if (signal.dcd === false) {
        document.getElementById('dcd-btn').style.cssText = 'background-color: #dfdfdf !important'
      } else {
        document.getElementById('dcd-btn').style.cssText = 'background-color: #26a69a !important'
      }
    }
  })
}

// Only readonly signals need reset
function modemSignalReset() {
  modemSignal.cts = false
  modemSignal.dsr = false
  modemSignal.dcd = false
  document.getElementById('cts-btn').style.cssText = 'background-color: #dfdfdf !important'
  document.getElementById('dsr-btn').style.cssText = 'background-color: #dfdfdf !important'
  document.getElementById('dcd-btn').style.cssText = 'background-color: #dfdfdf !important'
}

function serialGetOptions() {
  let openOptions = {}

  let baudRate = parseInt(
    document.getElementById('baud-select').options[store.get('baudIndex')].text
  )
  if (isNaN(baudRate) === true) baudRate = 115200
  openOptions.baudRate = baudRate

  let dataBits = parseInt(
    document.getElementById('databits-select').options[store.get('general.databitsIndex')].text
  )
  if (isNaN(dataBits) === true) dataBits = 8
  openOptions.dataBits = dataBits

  let parity = document
    .getElementById('parity-select')
    .options[store.get('general.parityIndex')].text.toLowerCase()
  openOptions.parity = parity

  let stopBits = parseInt(
    document.getElementById('stopbits-select').options[store.get('general.stopbitsIndex')].text
  )
  if (isNaN(stopBits) === true) stopBits = 1
  openOptions.stopBits = stopBits

  let flowcontrol = document
    .getElementById('flowcontrol-select')
    .options[store.get('general.flowcontrolIndex')].text.toLowerCase()
  openOptions[flowcontrol] = true

  openOptions.autoOpen = true

  return openOptions
}

function toast(text) {
  mcss.toast({ html: text, displayLength: 2000 })
  // alert(text);
}

function serialClose() {
  port === undefined ? null : port.close()
}

function serialWrite(data) {
  if (port === undefined || port.isOpen === false) {
    toast('Error: No port opened, cannot write')
    if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer)
    return false
  }

  port.write(data)
  return true
}

document.getElementById('port-switch').onclick = (e) => {
  if (e.target.checked === true) {
    let pathSelect = document.getElementById('path-select')
    let portPath = pathSelect.options[pathSelect.selectedIndex].label.split(' ')[0]

    port = new serial(portPath, serialGetOptions())

    port.addListener("txData", (data) => {
      console.log("txData", data);
      port.serialWrite(data);
    });

    port.addListener("ctlClose", () => {
      console.log("close the port")
      port.close();
    });

    port.on('open', () => {
      console.log('port open event')
      if (modemSignalTimer !== undefined) clearInterval(modemSignalTimer)
      if (store.get('general.modemSignal') === true) {
        modemSignalTimer = setInterval(modemSignalTimerHandle, 100)
      }
      // Some device use rts/dtr for private purpose, so below code
      // may cause strange behaviors.
      // Below setting can fix known issues on certain devices, but may
      // cause issues to other devices.
      // To fit your device's private behavior, first config setting before
      // open the port.
      port.set(
        {
          rts: store.get('general.modemSignal.rts'),
          dtr: store.get('general.modemSignal.dtr'),
        },
        (e) => {
          if (e !== null) console.error(e)
        }
      )
    })

    port.on('error', (e) => {
      toast(e.message)
      document.getElementById('port-switch').checked = false
      if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer)
      if (modemSignalTimer !== undefined) clearInterval(modemSignalTimer)
    })

    port.on('close', (e) => {
      console.log('port close event')

      if (e !== null) console.error(e)
      document.getElementById('port-switch').checked = false
      if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer)
      if (modemSignalTimer !== undefined) {
        clearInterval(modemSignalTimer)
      }

      modemSignalReset()
      editorStateReset()
    })

    port.on('drain', () => {
      toast('Error: Write failed, please try again')
    })

    port.on('data', (data) => {
      if (store.get('general.hexmode') === true) {
        window.hexModeProcess(data, true)
      } else {
        chartFrameProcess(data)
        stringModeProcess(data)
      }
    })
  } else {
    if (port === undefined || port.isOpen === false) {
      document.getElementById('port-switch').checked = false
    } else {
      port.close()
    }
  }
}

document.getElementById('rts-btn').onclick = (e) => {
  console.log('rts click')

  if (store.get('general.modemSignal.rts') === true) {
    store.set('general.modemSignal.rts', false)
    e.target.classList.add('grey')
  } else {
    store.set('general.modemSignal.rts', true)
    e.target.classList.remove('grey')
  }

  if (port === undefined || port.isOpen === false) return
  port.set(
    {
      rts: store.get('general.modemSignal.rts'),
      dtr: store.get('general.modemSignal.dtr'),
    },
    (e) => {
      if (e !== null) console.error(e)
    }
  )
}

document.getElementById('dtr-btn').onclick = (e) => {
  console.log('dtr click')

  if (store.get('general.modemSignal.dtr') === true) {
    store.set('general.modemSignal.dtr', false)
    e.target.classList.add('grey')
  } else {
    store.set('general.modemSignal.dtr', true)
    e.target.classList.remove('grey')
  }

  if (port === undefined || port.isOpen === false) return
  port.set(
    {
      rts: store.get('general.modemSignal.rts'),
      dtr: store.get('general.modemSignal.dtr'),
    },
    (e) => {
      if (e !== null) console.error(e)
    }
  )
}

document.getElementById('baud-select').onchange = (e) => {
  let ele = e.target

  store.set('baudIndex', ele.selectedIndex)
  if (port === undefined || port.isOpen === false) return

  let baudRate = parseInt(ele.options[ele.selectedIndex].text)
  if (isNaN(baudRate) === true) baudRate = 115200
  port.update({ baudRate: baudRate }, (e) => {
    if (e !== null) console.error(e)
  })
}

document.getElementById('path-select').onchange = (e) => {
  store.set('pathIndex', e.target.selectedIndex)
  if (port === undefined || port.isOpen === false) return

  port.close()
  setTimeout(() => {
    document.getElementById('port-switch').click()
  }, 400)
}

// Automatically update port
let pathUpdated = false
document.getElementById('path-input').onmouseover = (e) => {
  if (true === pathUpdated) return
  pathUpdated = true
  portUpdate()
}
document.getElementById('path-input').onmouseleave = (e) => {
  pathUpdated = false
}

let transRepeatTimer
document.getElementById('trans-send-btn').onclick = () => {
  const logObj = document.getElementById('trans-log-area')
  const dataObj = document.getElementById('trans-data')

  let dataIn = dataObj.value
  let dataOut = dataIn
  let eof = store.get('transmit.eof')
  if (true === store.get('transmit.hexmode')) {
    dataOut = Buffer.from(dataIn, 'hex')
  } else {
    dataOut += eof
  }

  if (serialWrite(dataOut) === false) return

  logObj.value += '\n' + dataIn
  mcss.updateTextFields(logObj)
  mcss.textareaAutoResize(logObj)
  logObj.scrollTop = logObj.scrollHeight

  if (document.getElementById('trans-repeat-switch').checked === true) {
    if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer)

    let interval = document.getElementById('trans-repeat-interval').value
    interval = parseInt(interval)
    if (isNaN(interval) === true) interval = 1000

    transRepeatTimer = setInterval(() => {
      serialWrite(dataOut)
    }, interval)
  }

  // clear data element
  if (true === store.get('transmit.clean')) dataObj.value = ''
}

document.getElementById('trans-repeat-switch').onchange = (e) => {
  let checked = e.target.checked

  if (checked === false && transRepeatTimer !== undefined) clearInterval(transRepeatTimer)
}
