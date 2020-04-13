/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { remote, shell, ipcRenderer, clipboard } = require("electron");
const Store = require("electron-store");
const appVersion = remote.app.getVersion();
const appUpdaterUrl =
  "https://api.github.com/repos/xenkuo/comNG/releases/latest";

var M = require("materialize-css");
M.AutoInit();

var config;
const store = new Store({
  projectVersion: appVersion,
  migrations: {
    "1.0.3": (store) => {
      store.delete("desert");
      store.delete("about");
      store.set("window.width", 600);
      store.set("window.height", 640);
      store.set("window.widthBefore", 600);
      store.set("window.heightBefore", 640);
      store.set("window.xBefore", 0);
      store.set("window.yBefore", 0);

      store.set("menu.hidden", true);
      store.set("menu.tab", "general");

      store.set("baudIndex", 2);
      store.set("pathIndex", 0);

      store.set("general.hexmode", false);
      store.set("general.timestamp", false);
      store.set("general.customized", 9600);
      store.set("general.databitsIndex", 0);
      store.set("general.parityIndex", 0);
      store.set("general.stopbitsIndex", 0);
      store.set("general.flowcontrolIndex", 0);

      store.set("transmit.eof", "\r\n");

      store.set("advance.sign.switch", false);
      store.set("advance.sign.name", "");
      store.set("advance.breakpoint.switch", false);
      store.set("advance.breakpoint.onText", "Error");
      store.set("advance.breakpoint.afterLines", 5);
      store.set("advance.barColor.head", "#fafafa");
      store.set("advance.barColor.middle", "#fafafa");
      store.set("advance.barColor.tail", "#26a69a");
    },
  },
});

function configUpdate(key, value) {
  let keyArray = key.split(".");

  if (keyArray.length === 1) {
    config[keyArray[0]] = value;
  } else if (keyArray.length === 2) {
    config[keyArray[0]][keyArray[1]] = value;
  } else if (keyArray.length === 3) {
    config[keyArray[0]][keyArray[1]][keyArray[2]] = value;
  } else {
    console.error("config key structure error");
  }

  store.set(key, value);
}

ipcRenderer.on("clear-text", (event, arg) => {
  console.log(arg);
  if (arg === "Clear") {
    let text = editor.getModel().getValue();
    clipboard.writeText(text);
    editor.getModel().setValue("");
  } else if (arg === "Switch")
    document.getElementById("port-switch").click();
});

window.onload = () => {
  console.log("window onload");

  config = store.store;
  document.getElementById("menu-area").hidden = config.menu.hidden;

  let nav = document.getElementById("nav-area");
  let bar = document.getElementById("bar-area");
  let menu = document.getElementById("menu-area");
  let editor = document.getElementById("editor-area");

  editor.style.height =
    window.innerHeight -
    nav.offsetHeight -
    bar.offsetHeight -
    menu.offsetHeight +
    "px";

  M.Tabs.getInstance(document.getElementById("menu-tabs")).select(
    config.menu.tab
  );

  let baudSelect = document.getElementById("baud-select");
  baudSelect.options[0].text = config.general.customized;
  baudSelect.selectedIndex = config.baudIndex;
  M.FormSelect.init(baudSelect);

  portUpdate();

  document.getElementById("hexmode-switch").checked = config.general.hexmode;
  document.getElementById("timestamp-switch").checked =
    config.general.timestamp;
  document.getElementById("customized").value = config.general.customized;

  let databits = document.getElementById("databits-select");
  databits.selectedIndex = config.general.databitsIndex;
  M.FormSelect.init(databits);
  let parity = document.getElementById("parity-select");
  parity.selectedIndex = config.general.parityIndex;
  M.FormSelect.init(parity);
  let stopbits = document.getElementById("stopbits-select");
  stopbits.selectedIndex = config.general.stopbitsIndex;
  M.FormSelect.init(stopbits);
  let flowcontrol = document.getElementById("flowcontrol-select");
  flowcontrol.selectedIndex = config.general.flowcontrolIndex;
  M.FormSelect.init(flowcontrol);

  document.getElementById("breakpoint-switch").checked =
    config.advance.breakpoint.switch;
  document.getElementById("breakpoint-on-text").value =
    config.advance.breakpoint.onText;
  document.getElementById("breakpoint-after-lines").value =
    config.advance.breakpoint.afterLines;

  document.getElementById("sign-switch").checked = config.advance.sign.switch;
  document.getElementById("sign-name").value = config.advance.sign.name;

  document.getElementById("bar-color-head").value =
    config.advance.barColor.head;
  document.getElementById("bar-color-middle").value =
    config.advance.barColor.middle;
  document.getElementById("bar-color-tail").value =
    config.advance.barColor.tail;

  document.documentElement.style.setProperty(
    "--bar-color-head",
    config.advance.barColor.head
  );
  document.documentElement.style.setProperty(
    "--bar-color-middle",
    config.advance.barColor.middle
  );
  document.documentElement.style.setProperty(
    "--bar-color-tail",
    config.advance.barColor.tail
  );

  document.getElementById("app-version").innerHTML = appVersion;
  console.log("Current Version: ", appVersion);

  fetch(appUpdaterUrl)
    .then((data) => {
      return data.json();
    })
    .then((res) => {
      let latest = res.tag_name.split("v")[1];
      if (latest !== appVersion) {
        const dialogOpts = {
          type: "info",
          buttons: ["Download Now", "Later"],
          message: "Version: " + latest + " released!",
          detail: res.body,
        };

        dialog.showMessageBox(dialogOpts).then((returnValue) => {
          if (returnValue.response === 0) shell.openExternal(res.html_url);
        });
      }
    });
};

window.onresize = () => {
  configUpdate("window.width", window.innerWidth);
  configUpdate("window.height", window.innerHeight);

  let nav = document.getElementById("nav-area");
  let bar = document.getElementById("bar-area");
  let menu = document.getElementById("menu-area");
  let editor = document.getElementById("editor-area");

  editor.style.height =
    window.innerHeight -
    nav.offsetHeight -
    bar.offsetHeight -
    menu.offsetHeight +
    "px";
};

// prevent text select for double click action
document.getElementById("nav-area").onmousedown = () => {
  return false;
};

document.getElementById("nav-area").ondblclick = () => {
  if (
    window.innerWidth === screen.width ||
    window.innerHeight === screen.height
  ) {
    window.resizeTo(config.window.widthBefore, config.window.heightBefore);
    window.moveTo(config.window.xBefore, config.window.yBefore);
  } else {
    configUpdate("window.widthBefore", window.innerWidth);
    configUpdate("window.heightBefore", window.innerHeight);
    configUpdate("window.xBefore", window.screenX);
    configUpdate("window.yBefore", window.screenY);

    window.resizeTo(screen.width, screen.height);
    window.moveTo(0, 0);
  }
};

document.getElementById("logo").onclick = () => {
  shell.openExternal("https://github.com/xenkuo/comNG");
};

document.getElementById("min-btn").onclick = () => {
  remote.getCurrentWindow().minimize();
};

document.getElementById("max-btn").onclick = () => {
  configUpdate("window.widthBefore", window.innerWidth);
  configUpdate("window.heightBefore", window.innerHeight);
  configUpdate("window.xBefore", window.screenX);
  configUpdate("window.yBefore", window.screenY);

  window.resizeTo(screen.width, screen.height);
  window.moveTo(0, 0);
};

document.getElementById("close-btn").onclick = () => {
  window.close();
};

document.getElementById("menu-btn").onclick = () => {
  let menu = document.getElementById("menu-area");
  let editor = document.getElementById("editor-area");

  if (menu.hidden === true) {
    editor.style.height = editor.offsetHeight - 200 + "px";
    menu.hidden = false;

    configUpdate("menu.hidden", false);
  } else {
    editor.style.height = editor.offsetHeight + 200 + "px";
    menu.hidden = true;

    configUpdate("menu.hidden", true);
  }
};

document.getElementById("menu-tabs").onclick = () => {
  let tabs = M.Tabs.getInstance(document.getElementById("menu-tabs"));

  configUpdate("menu.tab", tabs.$content[0].id);
};

document.getElementById("hexmode-switch").onclick = (e) => {
  configUpdate("general.hexmode", e.target.checked);
};

document.getElementById("timestamp-switch").onclick = (e) => {
  configUpdate("general.timestamp", e.target.checked);
};

document.getElementById("customized").onblur = (e) => {
  let customized = parseInt(e.target.value);

  if (isNaN(customized) === true) customized = 9600;
  configUpdate("general.customized", customized);

  let baudSelect = document.getElementById("baud-select");

  baudSelect.options[0].text = customized;
  M.FormSelect.init(baudSelect);
};

document.getElementById("databits-select").onchange = (e) => {
  configUpdate("general.databitsIndex", e.target.selectedIndex);
};

document.getElementById("parity-select").onchange = (e) => {
  configUpdate("general.parityIndex", e.target.selectedIndex);
};

document.getElementById("stopbits-select").onchange = (e) => {
  configUpdate("general.stopbitsIndex", e.target.selectedIndex);
};

document.getElementById("flowcontrol-select").onchange = (e) => {
  configUpdate("general.flowcontrolIndex", e.target.selectedIndex);
};

document.getElementById("sign-switch").onclick = (e) => {
  configUpdate("advance.sign.switch", e.target.checked);
};

document.getElementById("sign-name").onblur = (e) => {
  configUpdate("advance.sign.name", e.target.value);
};

let txRepeatTimer = undefined;
document.getElementById("tx-eof-select").onchange = (e) => {
  let index = e.target.selectedIndex;
  let eof = "\r\n";
  switch (index) {
    case 1:
      eof = "\r";
      break;
    case 2:
      eof = "\n";
      break;
    default:
      break;
  }

  configUpdate("transmit.eof", eof);
};

// document.getElementById('tx-clear-btn').onclick = () => {
//   document.getElementById('tx-data').value = ''
// }

document.getElementById("tx-send-btn").onclick = () => {
  const p = document.getElementById("tx-log-area");
  let data = document.getElementById("tx-data").value;

  if (data.trim() === "") return;

  data += config.transmit.eof;
  if (serialWrite(data) === false) return;

  p.value += "\n" + document.getElementById("tx-data").value;
  M.updateTextFields(p);
  M.textareaAutoResize(p);

  if (document.getElementById("tx-repeat-switch").checked === true) {
    let interval = document.getElementById("tx-repeat-interval").value;
    interval = parseInt(interval);
    if (isNaN(interval) === true) interval = 1000;

    txRepeatTimer = setInterval(() => {
      serialWrite(data);
    }, interval);
  }
};

document.getElementById("tx-repeat-switch").onchange = (e) => {
  let checked = e.target.checked;

  if (checked === false && txRepeatTimer !== undefined)
    clearInterval(txRepeatTimer);
};

document.getElementById("tx-log-clear-btn").onclick = () => {
  let p = document.getElementById("tx-log-area");

  p.value = "";
  M.updateTextFields(p);
  M.textareaAutoResize(p);
};

document.getElementById("bar-color-head").oninput = (e) => {
  let color = e.target.value;

  document.documentElement.style.setProperty("--bar-color-head", color);
  configUpdate("advance.barColor.head", color);
};

document.getElementById("bar-color-middle").oninput = (e) => {
  let color = e.target.value;

  document.documentElement.style.setProperty("--bar-color-middle", color);
  configUpdate("advance.barColor.middle", color);
};

document.getElementById("bar-color-tail").oninput = (e) => {
  let color = e.target.value;

  document.documentElement.style.setProperty("--bar-color-tail", color);
  configUpdate("advance.barColor.tail", color);
};

document.getElementById("issue").onclick = (e) => {
  console.log("licence click", e);
  e.preventDefault();
  shell.openExternal(e.target.href);
};

document.getElementById("introduction").onclick = (e) => {
  console.log("licence click", e);
  e.preventDefault();
  shell.openExternal(e.target.href);
};

document.getElementById("comnglang").onclick = (e) => {
  console.log("licence click", e);
  e.preventDefault();
  shell.openExternal(e.target.href);
};

document.getElementById("baud-select").onchange = (e) => {
  configUpdate("baudIndex", e.target.selectedIndex);
};

// document.getElementById("path-input").addEventListener(
//   "click",
//   e => {
//     console.log("path select add event");
//     if (e.isTrusted === false) return;
//     console.log("path x");
//     e.stopPropagation();
//     // portUpdate();
//     setTimeout(() => {
//       try {
//         let evt = document.createEvent("Event");
//         evt.initEvent("click", true, true);
//         document.getElementById("path-select").dispatchEvent(evt);
//       } catch (e) {
//         console.error(e);
//       }
//     }, 5000);
//   },
//   true
// );

document.getElementById("path-select").onchange = (e) => {
  configUpdate("pathIndex", e.target.selectedIndex);
};

document.getElementById("refresh-btn").onclick = portUpdate;
