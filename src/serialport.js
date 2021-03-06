/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const serial = require("serialport");

var port, modemSignalTimer;
var modemSignal = {
  cts: false,
  dsr: false,
  dcd: false,
};

function portUpdate() {
  let pSelect = document.getElementById("path-select");
  pSelect.options.length = 0;

  serial
    .list()
    .then((ports) => {
      ports.forEach((item, index) => {
        // console.log(item, index);
        pSelect.options.add(new Option(item.path, index));
        if (index === config.pathIndex) pSelect.selectedIndex = index;
      });
      mcss.FormSelect.init(pSelect);
    })
    .catch((e) => {
      console.error(e);
    });
}

function modemSignalTimerHandle() {
  if (port === undefined || port.isOpen === false)
    return clearInterval(modemSignalTimer);

  port.get((e, signal) => {
    if (e) return console.error(e);

    if (signal.cts !== modemSignal.cts) {
      modemSignal.cts = signal.cts;
      if (signal.cts === false) {
        document.getElementById("cts-btn").style.cssText =
          "background-color: #dfdfdf !important";
      } else {
        document.getElementById("cts-btn").style.cssText =
          "background-color: #26a69a !important";
      }
    }
    if (signal.dsr !== modemSignal.dsr) {
      modemSignal.dsr = signal.dsr;
      if (signal.dsr === false) {
        document.getElementById("dsr-btn").style.cssText =
          "background-color: #dfdfdf !important";
      } else {
        document.getElementById("dsr-btn").style.cssText =
          "background-color: #26a69a !important";
      }
    }
    if (signal.dcd !== modemSignal.dcd) {
      modemSignal.dcd = signal.dcd;
      if (signal.dcd === false) {
        document.getElementById("dcd-btn").style.cssText =
          "background-color: #dfdfdf !important";
      } else {
        document.getElementById("dcd-btn").style.cssText =
          "background-color: #26a69a !important";
      }
    }
  });
}

// Only readonly signals need reset
function modemSignalReset() {
  modemSignal.cts = false;
  modemSignal.dsr = false;
  modemSignal.dcd = false;
  document.getElementById("cts-btn").style.cssText =
    "background-color: #dfdfdf !important";
  document.getElementById("dsr-btn").style.cssText =
    "background-color: #dfdfdf !important";
  document.getElementById("dcd-btn").style.cssText =
    "background-color: #dfdfdf !important";
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

function toast(text) {
  mcss.toast({ html: text, displayLength: 1000 });
  // alert(text);
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
      // Some device use rts/dtr for private purpose, so below code
      // may cause strange behaviors.
      // Below setting can fix known issues on certain devices, but may
      // cause issues to other devices.
      // To fit your device's private behavior, first config setting before
      // open the port.
      port.set(
        {
          rts: config.general.modemSignal.rts,
          dtr: config.general.modemSignal.dtr,
        },
        (e) => {
          if (e !== null) console.error(e);
        }
      );
    });

    port.on("error", (e) => {
      toast(e.message);
      document.getElementById("port-switch").checked = false;
      if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer);
      if (modemSignalTimer !== undefined) clearInterval(modemSignalTimer);
    });

    port.on("close", (e) => {
      console.log("port close event");

      if (e !== null) console.error(e);
      document.getElementById("port-switch").checked = false;
      if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer);
      if (modemSignalTimer !== undefined) {
        clearInterval(modemSignalTimer);
      }

      modemSignalReset();
      editorStateReset();
    });

    port.on("drain", () => {
      toast("Error: Write failed, please try again");
    });

    port.on("data", (data) => {
      if (config.general.hexmode === true) {
        hexModeProcess(data, true);
      } else {
        chartFrameProcess(data);
        stringModeProcess(data);
      }
    });
  } else {
    if (port === undefined || port.isOpen === false) {
      document.getElementById("port-switch").checked = false;
    } else {
      port.close();
    }
  }
};

document.getElementById("rts-btn").onclick = (e) => {
  console.log("rts click");

  if (config.general.modemSignal.rts === true) {
    configUpdate("general.modemSignal.rts", false);
    e.target.classList.add("grey");
  } else {
    configUpdate("general.modemSignal.rts", true);
    e.target.classList.remove("grey");
  }

  if (port === undefined || port.isOpen === false) return;
  port.set(
    {
      rts: config.general.modemSignal.rts,
      dtr: config.general.modemSignal.dtr,
    },
    (e) => {
      if (e !== null) console.error(e);
    }
  );
};

document.getElementById("dtr-btn").onclick = (e) => {
  console.log("dtr click");

  if (config.general.modemSignal.dtr === true) {
    configUpdate("general.modemSignal.dtr", false);
    e.target.classList.add("grey");
  } else {
    configUpdate("general.modemSignal.dtr", true);
    e.target.classList.remove("grey");
  }

  if (port === undefined || port.isOpen === false) return;
  port.set(
    {
      rts: config.general.modemSignal.rts,
      dtr: config.general.modemSignal.dtr,
    },
    (e) => {
      if (e !== null) console.error(e);
    }
  );
};
