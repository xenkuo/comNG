/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { remote, shell, ipcRenderer, clipboard } = require("electron");
const Store = require("electron-store");
const appVersion = remote.app.getVersion();
const appUpdaterUrl =
  "https://gitee.com/api/v5/repos/xenkuo/comNG/releases/latest";

var mcss = require("materialize-css");
mcss.AutoInit();

var config;
var barHeight;
var menuHeight;
var textDownward = true;

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

      store.set("baudIndex", 3);
      store.set("pathIndex", 0);

      store.set("general.hexmode", false);
      store.set("general.timestamp", false);
      store.set("general.customized", 4800);
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
      store.set("advance.barColor.head", "#ffba3a");
      store.set("advance.barColor.middle", "#ffba3a");
      store.set("advance.barColor.tail", "#ffba3a");
    },
    "1.0.4": (store) => {
      store.set("general.modemSignal", false);
      store.set(
        "general.fontFamily",
        "'Cascadia Mono', Consolas, 'SF Mono', 'Ubuntu Mono', Menlo, 'Lucida Console', 'Courier New', monospace"
      );
      store.set("general.fontSize", 12);
    },
    "1.0.6": (store) => {
      store.set("transmit.hexmode", false);
      store.set("about.insiderPreview", false);
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

ipcRenderer.on("main-cmd", (event, arg) => {
  console.log(arg);
  switch (arg) {
    case "ClearLog":
      clipboard.writeText(editor.getModel().getValue());
      document.getElementById("clear-btn").click();
      break;
    case "SwitchPort":
      document.getElementById("port-switch").click();
      break;
    case "ClearLog&SwitchPort": {
      let portSwitch = document.getElementById("port-switch");
      portSwitch.click();
      if (true == portSwitch.checked) {
        clipboard.writeText(editor.getModel().getValue());
        document.getElementById("clear-btn").click();
      }
      break;
    }
    case "OpenFile":
      openFile();
      break;
    case "OpenBinFile":
      openBinFile();
      break;
    case "SaveFile":
      saveToFile();
      break;
    default:
      console.log("Unknown commands");
      break;
  }
});

window.onload = () => {
  config = store.store;
  document.getElementById("menu-area").hidden = config.menu.hidden;

  barHeight = getComputedStyle(document.documentElement)
    .getPropertyValue("--bar-height")
    .trim()
    .split("px")[0];
  barHeight = parseInt(barHeight);
  menuHeight = getComputedStyle(document.documentElement)
    .getPropertyValue("--menu-height")
    .trim()
    .split("px")[0];
  menuHeight = parseInt(menuHeight);

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

  mcss.Tabs.getInstance(document.getElementById("menu-tabs")).select(
    config.menu.tab
  );

  let baudSelect = document.getElementById("baud-select");
  baudSelect.options[0].text = config.general.customized;
  baudSelect.selectedIndex = config.baudIndex;
  mcss.FormSelect.init(baudSelect);

  portUpdate();

  document.getElementById("hexmode-switch").checked = config.general.hexmode;
  document.getElementById("timestamp-switch").checked =
    config.general.timestamp;
  document.getElementById("modem-signal-switch").checked =
    config.general.modemSignal;
  if (config.general.modemSignal === true) {
    document.getElementById("modem-signal-bar").hidden = false;
  } else {
    document.getElementById("modem-signal-bar").hidden = true;
  }
  document.getElementById("customized").value = config.general.customized;

  let databits = document.getElementById("databits-select");
  databits.selectedIndex = config.general.databitsIndex;
  mcss.FormSelect.init(databits);
  let parity = document.getElementById("parity-select");
  parity.selectedIndex = config.general.parityIndex;
  mcss.FormSelect.init(parity);
  let stopbits = document.getElementById("stopbits-select");
  stopbits.selectedIndex = config.general.stopbitsIndex;
  mcss.FormSelect.init(stopbits);
  let flowcontrol = document.getElementById("flowcontrol-select");
  flowcontrol.selectedIndex = config.general.flowcontrolIndex;
  mcss.FormSelect.init(flowcontrol);

  document.getElementById("editor-font-family").value =
    config.general.fontFamily;
  document.getElementById("editor-font-size").value = config.general.fontSize;

  document.getElementById("trans-hexmode-switch").checked =
    config.transmit.hexmode;
  let transEof = document.getElementById("trans-eof-select");
  let transEofIndex = 0;
  if ("\n" === config.transmit.eof) {
    transEofIndex = 1;
  } else if ("\r" === config.transmit.eof) {
    transEofIndex = 2;
  } else if ("term" === config.transmit.eof) {
    transEofIndex = 3;
  }
  transEof.selectedIndex = transEofIndex;
  mcss.FormSelect.init(transEof);

  document.getElementById("breakpoint-switch").checked =
    config.advance.breakpoint.switch;
  document.getElementById("breakpoint-on-text").value =
    config.advance.breakpoint.onText;
  document.getElementById("breakpoint-after-lines").value =
    config.advance.breakpoint.afterLines;

  document.getElementById("sign-switch").checked = config.advance.sign.switch;
  document.getElementById("sign-name").value = config.advance.sign.name;

  document.getElementById("insider-preview").checked =
    config.about.insiderPreview;

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

  function platformUpdateCheck(assets) {
    const os = require("os");
    let platform = os.platform();
    let suffix = "exe";

    if ("darwin" === platform) suffix = "dmg";
    else if ("linux" === platform) suffix = "deb";

    for (const asset of assets) {
      if (asset.name !== undefined && -1 !== asset.name.indexOf(suffix)) {
        return true;
      }
    }

    return false;
  }

  fetch(appUpdaterUrl)
    .then((data) => {
      return data.json();
    })
    .then((res) => {
      if (res.prerelease === true && config.about.insiderPreview === false)
        return;

      let latest = res.tag_name.split("v")[1];
      if (latest !== appVersion && true === platformUpdateCheck(res.assets)) {
        const dialogOpts = {
          type: "info",
          buttons: ["Download Now", "Later"],
          message: "Version: " + latest + " released!",
          detail: res.body,
        };

        dialog.showMessageBox(dialogOpts).then((returnValue) => {
          if (returnValue.response === 0)
            shell.openExternal(res.author.html_url + "/comNG/releases");
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

document.onkeydown = function (e) {
  e = e || window.event;
  switch (e.which || e.keyCode) {
    case 13:
      console.log("Enter key pressed.");
      if (document.activeElement.id === "trans-data") {
        document.getElementById("trans-send-btn").click();
      }
      break;
    default:
      break;
  }
};

// For drag region which nav-area is, the behavior is different between Mac and Windows/Debian:
// On Windows/Debian a drag region is taken as system title bar, and all event is captured by
// system, app can't get any click or mouse event. At the same time, double click event
// will resize app window by system, no need for app to implement manually.
// On Mac, however, a drag region has no much different with common html element except supporting drag action. App can
// capture most of events and window resize(maximum and restore) should be implemented
// by app.
// In short, below two listener, onmousedown and ondbclick is only needed on Mac.
// And there's a drawback as Windows/Debian has implemented such function internally that maximum
// button info is not synced with system maximum and restore.
document.getElementById("nav-area").onmousedown = () => {
  // prevent text select for double click action
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
  shell.openExternal("https://gitee.com/xenkuo/comNG");
};

document.getElementById("min-btn").onclick = () => {
  remote.getCurrentWindow().minimize();
};

document.getElementById("max-btn").onclick = () => {
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

document.getElementById("close-btn").onclick = () => {
  window.close();
};

document.getElementById("menu-btn").onclick = () => {
  let menu = document.getElementById("menu-area");
  let editor = document.getElementById("editor-area");

  if (menu.hidden === true) {
    editor.style.height = editor.offsetHeight - menuHeight + "px";
    menu.hidden = false;

    configUpdate("menu.hidden", false);
  } else {
    editor.style.height = editor.offsetHeight + menuHeight + "px";
    menu.hidden = true;

    configUpdate("menu.hidden", true);
  }
};

document.body.onclick = (e) => {
  // don't process fake click
  if (e.isTrusted === false) return;
  // don't process when click on menu-btn
  if (e.target.parentNode.id === "menu-btn") return;
  // don't process when we are in Transmit tab
  if (document.getElementById("menu-tabs").M_Tabs.index === 1) return;

  let pos = e.clientY;
  let range = document.body.offsetHeight;

  if (pos > range - barHeight || pos < range - barHeight - menuHeight) {
    let menu = document.getElementById("menu-area");
    let editor = document.getElementById("editor-area");

    if (menu.hidden === false) {
      editor.style.height = editor.offsetHeight + menuHeight + "px";
      menu.hidden = true;

      configUpdate("menu.hidden", true);
    }
  }
};

document.getElementById("menu-tabs").onclick = () => {
  let tabs = mcss.Tabs.getInstance(document.getElementById("menu-tabs"));

  configUpdate("menu.tab", tabs.$content[0].id);
};

document.getElementById("hexmode-switch").onclick = (e) => {
  configUpdate("general.hexmode", e.target.checked);
};

document.getElementById("timestamp-switch").onclick = (e) => {
  configUpdate("general.timestamp", e.target.checked);
};

document.getElementById("modem-signal-switch").onclick = (e) => {
  let state = e.target.checked;

  configUpdate("general.modemSignal", state);
  if (state === true) {
    document.getElementById("modem-signal-bar").hidden = false;
  } else {
    document.getElementById("modem-signal-bar").hidden = true;
  }
};

document.getElementById("customized").onblur = (e) => {
  let customized = parseInt(e.target.value);

  if (isNaN(customized) === true) customized = 4800;
  configUpdate("general.customized", customized);

  let baudSelect = document.getElementById("baud-select");

  baudSelect.options[0].text = customized;
  mcss.FormSelect.init(baudSelect);
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

let transRepeatTimer = undefined;
document.getElementById("trans-send-btn").onclick = () => {
  const logObj = document.getElementById("trans-log-area");
  const dataObj = document.getElementById("trans-data");

  let dataIn = dataObj.value;
  let dataOut = dataIn;
  let eof = config.transmit.eof;
  if (true === config.transmit.hexmode) {
    dataOut = Buffer.from(dataIn, "hex");
  } else {
    if (eof === "term") {
      eof = "\n";
      dataObj.value = "";
    }
    dataOut += eof;
  }
  if (serialWrite(dataOut) === false) return;

  logObj.value += "\n" + dataIn;
  mcss.updateTextFields(logObj);
  mcss.textareaAutoResize(logObj);
  logObj.scrollTop = logObj.scrollHeight;

  if (document.getElementById("trans-repeat-switch").checked === true) {
    if (transRepeatTimer !== undefined) clearInterval(transRepeatTimer);

    let interval = document.getElementById("trans-repeat-interval").value;
    interval = parseInt(interval);
    if (isNaN(interval) === true) interval = 1000;

    transRepeatTimer = setInterval(() => {
      serialWrite(dataOut);
    }, interval);
  }
};

document.getElementById("trans-eof-select").onchange = (e) => {
  let index = e.target.selectedIndex;
  let eof = "\r\n";
  switch (index) {
    case 1:
      eof = "\n";
      break;
    case 2:
      eof = "\r";
      break;
    case 3:
      eof = "term";
      break;
    default:
      break;
  }

  configUpdate("transmit.eof", eof);
};

document.getElementById("trans-hexmode-switch").onchange = (e) => {
  let checked = e.target.checked;

  configUpdate("transmit.hexmode", checked);
};

document.getElementById("trans-repeat-switch").onchange = (e) => {
  let checked = e.target.checked;

  if (checked === false && transRepeatTimer !== undefined)
    clearInterval(transRepeatTimer);
};

document.getElementById("trans-log-btn").onclick = () => {
  let logObj = document.getElementById("trans-log-area");

  logObj.value = "";
  mcss.updateTextFields(logObj);
  mcss.textareaAutoResize(logObj);
};

document.getElementById("insider-preview").onclick = (e) => {
  configUpdate("about.insiderPreview", e.target.checked);
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
  e.preventDefault();
  shell.openExternal(e.target.href);
};

document.getElementById("introduction").onclick = (e) => {
  e.preventDefault();
  shell.openExternal(e.target.href);
};

document.getElementById("comnglang").onclick = (e) => {
  e.preventDefault();
  shell.openExternal(e.target.href);
};

document.getElementById("baud-select").onchange = (e) => {
  let ele = e.target;

  configUpdate("baudIndex", ele.selectedIndex);
  if (port === undefined || port.isOpen === false) return;

  let baudRate = parseInt(ele.options[ele.selectedIndex].text);
  if (isNaN(baudRate) === true) baudRate = 115200;
  port.update({ baudRate: baudRate }, (e) => {
    if (e !== null) console.error(e);
  });
};

document.getElementById("path-select").onchange = (e) => {
  configUpdate("pathIndex", e.target.selectedIndex);
  if (port === undefined || port.isOpen === false) return;

  port.close();
  setTimeout(() => {
    document.getElementById("port-switch").click();
  }, 400);
};

document.getElementById("refresh-btn").onclick = portUpdate;

document.getElementById("downward-btn").onclick = (e) => {
  if (textDownward === true) {
    textDownward = false;
    e.target.classList.add("grey");
  } else {
    textDownward = true;
    e.target.classList.remove("grey");
  }
};
