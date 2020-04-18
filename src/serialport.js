/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const serial = require("serialport");

var port, modemSignalTimer;
var modemSignal = {
  cts: false,
  dsr: false,
  dcd: false,
  rts: true,
  dtr: true,
};

function portUpdate() {
  let pSelect = document.getElementById("path-select");
  pSelect.options.length = 0;

  serial
    .list()
    .then((ports) => {
      ports.forEach((item, index) => {
        console.log(item, index);
        pSelect.options.add(new Option(item.path, index));
        if (index === config.pathIndex) pSelect.selectedIndex = index;
      });
      M.FormSelect.init(pSelect);
    })
    .catch((err) => {
      console.error(err);
    });
}

function modemSignalTimerHandle() {
  if (port === undefined || port.isOpen === false)
    return clearInterval(modemSignalTimer);

  port.get((e, signal) => {
    if (e) return console.error(e);

    signal.cts = true;
    if (signal.cts !== modemSignal.cts) {
      modemSignal.cts = signal.cts;
      if (signal.cts === false) {
        document.getElementById("cts-btn").style.cssText = "color: #9f9f9f";
      } else {
        document.getElementById("cts-btn").style.cssText =
          "color: red !important";
      }
    }
    if (signal.dsr !== modemSignal.dsr) {
      modemSignal.dsr = signal.dsr;
      if (signal.dsr === false) {
        document.getElementById("dsr-btn").style.cssText = "color: #9f9f9f";
      } else {
        document.getElementById("dsr-btn").style.cssText =
          "color: red !important";
      }
    }
    if (signal.dcd !== modemSignal.dcd) {
      modemSignal.dcd = signal.dcd;
      if (signal.dcd === false) {
        document.getElementById("dcd-btn").style.cssText = "color: #9f9f9f";
      } else {
        document.getElementById("dcd-btn").style.cssText =
          "color: red !important";
      }
    }
  });
}

function modemSignalReset() {
  modemSignal.cts = false;
  modemSignal.dsr = false;
  modemSignal.dcd = false;
  document.getElementById("cts-btn").style.cssText = "color: #9f9f9f";
  document.getElementById("dsr-btn").style.cssText = "color: #9f9f9f";
  document.getElementById("dcd-btn").style.cssText = "color: #9f9f9f";
}

function serialGetOptions() {
  let openOptions = {};

  let baudRate = parseInt(
    document.getElementById("baud-select").options[config.baudIndex].text
  );
  if (isNaN(baudRate) === true) baudRate = 115200;
  openOptions.baudRate = baudRate;

  let dataBits = parseInt(
    document.getElementById("databits-select").options[
      config.general.databitsIndex
    ].text
  );
  if (isNaN(dataBits) === true) dataBits = 8;
  openOptions.dataBits = dataBits;

  let parity = document
    .getElementById("parity-select")
    .options[config.general.parityIndex].text.toLowerCase();
  openOptions.parity = parity;

  let stopBits = parseInt(
    document.getElementById("stopbits-select").options[
      config.general.stopbitsIndex
    ].text
  );
  if (isNaN(stopBits) === true) stopBits = 1;
  openOptions.stopBits = stopBits;

  let flowcontrol = document
    .getElementById("flowcontrol-select")
    .options[config.general.flowcontrolIndex].text.toLowerCase();
  openOptions[flowcontrol] = true;

  openOptions.autoOpen = true;

  return openOptions;
}

function serialGetSetOptions() {
  let setOptions = {
    // brk: false,    // use system default
    // cts: false,    // use system default
    // dsr: false,    // use system default
    // dtr: true,     // use system default
    // rts: true // required for certain board
  };

  return setOptions;
}

function toast(text) {
  M.toast({ html: text, displayLength: 1000 });
  // alert(text)
}

function serialClose() {
  port === undefined ? null : port.close();
}

function serialWrite(data) {
  if (port === undefined || port.isOpen === false) {
    toast("Error: No port opened, cannot write");
    if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer);
    return false;
  }

  port.write(data);
  return true;
}

document.getElementById("port-switch").onclick = (e) => {
  if (e.target.checked === true) {
    let pathSelect = document.getElementById("path-select");
    let portPath = pathSelect.options[pathSelect.selectedIndex].label;

    port = new serial(portPath, serialGetOptions());

    port.on("open", () => {
      console.log("port open event");
      if (modemSignalTimer !== undefined) clearInterval(modemSignalTimer);
      if (config.general.modemSignal === true) {
        modemSignalTimer = setInterval(modemSignalTimerHandle, 100);
      }
      // port.set(serialGetSetOptions(), (err) => {
      //   if (err !== null) console.error(err);
      // });
    });

    port.on("error", (err) => {
      toast(err.message);
      document.getElementById("port-switch").checked = false;
      if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer);
      if (modemSignalTimer !== undefined) clearInterval(modemSignalTimer);
    });

    port.on("close", (err) => {
      console.log("port close event");
      if (err !== null) console.error(err);
      document.getElementById("port-switch").checked = false;
      if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer);
      if (modemSignalTimer !== undefined) {
        clearInterval(modemSignalTimer);
        modemSignalReset();
      }
    });

    port.on("drain", () => {
      toast("Error: Write failed, please try again");
    });

    port.on("data", showBuff);
  } else {
    if (port === undefined || port.isOpen === false) {
      document.getElementById("port-switch").checked = false;
    } else {
      port.close();
    }
  }
};

document.getElementById("rts-btn").onclick = () => {
  console.log("rts click");
};

document.getElementById("dtr-btn").onclick = () => {
  if (port === undefined || port.isOpen === false) return;

  let option = serialGetSetOptions();
  option.dtr = true;
};
