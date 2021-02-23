/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { remote, shell, ipcRenderer, clipboard } = require("electron");
const Store = require("electron-store");
const appVersion = remote.app.getVersion();
const appUpdaterUrl =
  "https://gitee.com/api/v5/repos/xenkuo/comNG/releases/latest";
const defaultFont =
  "'Cascadia Mono', Consolas, 'SF Mono', 'Ubuntu Mono', 'Lucida Console', 'Courier New', 'Source Han Sans SC', 'Microsoft YaHei', 'WenQuanYi Micro Hei'";
const mcss = require("materialize-css");
const ChromeTabs = require("chrome-tabs");

mcss.AutoInit();
var chromeTabs = new ChromeTabs();

var config;
var barHeight;
var menuHeight;
var textDownward = true;
var ctrlKeyPressed = false;

const configDb = new Store({
  projectVersion: appVersion,
  migrations: {
    "1.0.3": (db) => {
      db.delete("desert");
      db.delete("about");
      db.set("window.width", 600);
      db.set("window.height", 640);
      db.set("window.widthBefore", 600);
      db.set("window.heightBefore", 640);
      db.set("window.xBefore", 0);
      db.set("window.yBefore", 0);

      db.set("menu.hidden", true);
      db.set("menu.tab", "general");

      db.set("baudIndex", 3);
      db.set("pathIndex", 0);

      db.set("general.hexmode", false);
      db.set("general.timestamp", false);
      db.set("general.customized", 4800);
      db.set("general.databitsIndex", 0);
      db.set("general.parityIndex", 0);
      db.set("general.stopbitsIndex", 0);
      db.set("general.flowcontrolIndex", 0);

      db.set("transmit.eof", "\r\n");

      db.set("advance.sign.switch", false);
      db.set("advance.sign.name", "");
      db.set("advance.breakpoint.switch", false);
      db.set("advance.breakpoint.onText", "Error");
      db.set("advance.breakpoint.afterLines", 5);
      db.set("advance.barColor.head", "#ffba3a");
      db.set("advance.barColor.middle", "#ffba3a");
      db.set("advance.barColor.tail", "#ffba3a");
    },
    "1.0.4": (db) => {
      db.set("general.modemSignal", false);
      db.set(
        "general.fontFamily",
        "'Cascadia Mono', Consolas, 'SF Mono', 'Ubuntu Mono', Menlo, 'Lucida Console', 'Courier New', monospace"
      );
      db.set("general.fontSize", 12);
    },
    "1.0.6": (db) => {
      db.set("transmit.hexmode", false);
      db.set("about.insiderPreview", false);
    },
    "1.0.11": (db) => {
      db.set("fileops.capture.switch", false);
      db.set("fileops.capture.filePath", "");
      db.delete("general.modemSignal");
      db.set("general.modemSignal.switch", false);
      db.set("general.modemSignal.rts", false);
      db.set("general.modemSignal.dtr", false);
    },
    "2.0.4": (db) => {
      db.set("general.fontFamily", defaultFont);
    },
    "2.1.0": (db) => {
      db.set("transmit.eof", "\r\n");
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

  configDb.set(key, value);
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
    case "OpenFileInNewTab":
      openFileInNewTab();
      break;
    case "OpenBinFile":
      openBinFile();
      break;
    case "SaveFile":
      saveFile();
      break;
    case "SaveAsFile":
      saveAsFile();
      break;
    case "NewTab":
      newTab();
      break;
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
      switchTab(arg);
      break;
    default:
      console.log("Unknown commands");
      break;
  }
});

var iconWidth;
var tabsOffset;
var tabStdWidth;
var dragMinWidth;

function nav_area_update() {
  const windowWidth = window.innerWidth;
  const tabsAreaEl = document.getElementById("tabs-area");
  const tabAddEl = document.getElementById("tab-add-btn");
  const dragAreaEl = document.getElementById("drag-area");
  const tabsMaxWidth = windowWidth - dragMinWidth;

  let tabsAreaWidth = parseInt(tabsAreaEl.style.width) | tabsAreaEl.offsetWidth;
  const els = document.getElementsByClassName("chrome-tab");
  tabsAreaWidth = els.length * tabStdWidth + tabsOffset;
  if (tabsAreaWidth > tabsMaxWidth) tabsAreaWidth = tabsMaxWidth;

  tabsAreaEl.style.width = tabsAreaWidth + "px";
  tabAddEl.style.left = tabsAreaWidth + "px";
  dragAreaEl.style.width = windowWidth - tabsAreaWidth - iconWidth + "px";
}

window.onload = () => {
  config = configDb.store;
  document.getElementById("menu-area").hidden = config.menu.hidden;

  // 0: update elements size and position
  const cStyle = getComputedStyle(document.documentElement);

  // 1: update css variable
  iconWidth = parseInt(cStyle.getPropertyValue("--icon-width"));
  tabsOffset = parseInt(cStyle.getPropertyValue("--tabs-offset"));
  tabStdWidth = parseInt(cStyle.getPropertyValue("--tab-std-width"));
  dragMinWidth = parseInt(cStyle.getPropertyValue("--drag-min-width"));
  barHeight = parseInt(cStyle.getPropertyValue("--bar-height"));
  menuHeight = parseInt(cStyle.getPropertyValue("--menu-height"));

  // 2: update editor height
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

  document.getElementById("hexmode-switch").checked = config.general.hexmode;

  document.getElementById("timestamp-switch").checked =
    config.general.timestamp;
  if (true === config.general.modemSignal.rts) {
    let e = document.getElementById("rts-btn");
    e.classList.remove("grey");
  }
  if (true === config.general.modemSignal.dtr) {
    let e = document.getElementById("dtr-btn");
    e.classList.remove("grey");
  }
  document.getElementById("modem-signal-switch").checked =
    config.general.modemSignal.switch;
  if (config.general.modemSignal.switch === true) {
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

  document.getElementById("capture-file-switch").checked =
    config.fileops.capture.switch;
  document.getElementById("capture-file-path").value =
    config.fileops.capture.filePath;
  if (true === config.fileops.capture.switch) {
    captureFileStream = fs.createWriteStream(config.fileops.capture.filePath, {
      flags: "a",
    });
  }

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
  console.log("comNG Version: ", appVersion);

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

  nav_area_update();
};

document.onkeydown = function (e) {
  e = e || window.event;
  // console.log(e.which, e.keyCode);

  switch (e.which || e.keyCode) {
    case 13: // the enter key
      if (document.activeElement.id === "trans-data") {
        document.getElementById("trans-send-btn").click();
      }
      break;
    case 9: // the tab key
      if (document.activeElement.id === "trans-data") {
        if (e.preventDefault) e.preventDefault();
        const transDataEl = document.getElementById("trans-data");
        serialWrite(transDataEl.value + "\t");
        transDataEl.value = "";
      }
      break;
    case 17:
      if (document.activeElement.id === "trans-data") {
        ctrlKeyPressed = true;
        setTimeout;
        setTimeout(() => {
          ctrlKeyPressed = false;
        }, 1000);
      }
      break;
    case 67:
      if (document.activeElement.id === "trans-data") {
        if (true === ctrlKeyPressed) {
          ctrlKeyPressed = false;
          serialWrite([3]); // send ctrl+c
        }
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
  // don't process when we are in Transmit tab/Graphic tab
  if (document.getElementById("menu-tabs").M_Tabs.index === 1) return;
  if (document.getElementById("menu-tabs").M_Tabs.index === 4) return;

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
  editor.updateOptions({ readOnly: e.target.checked });
};

document.getElementById("timestamp-switch").onclick = (e) => {
  configUpdate("general.timestamp", e.target.checked);
};

document.getElementById("modem-signal-switch").onclick = (e) => {
  let state = e.target.checked;

  configUpdate("general.modemSignal.switch", state);
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

  // clear data element
  dataObj.value = "";
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
  let logEl = document.getElementById("trans-log-area");

  logEl.value = "";
  mcss.updateTextFields(logEl);
  mcss.textareaAutoResize(logEl);
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

document.getElementById("star-me").onclick = (e) => {
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

// Automatically update port
var pathUpdated = false;
document.getElementById("path-input").onmouseover = (e) => {
  if (true === pathUpdated) return;
  pathUpdated = true;
  portUpdate();
};
document.getElementById("path-input").onmouseleave = (e) => {
  pathUpdated = false;
};

document.getElementById("downward-btn").onclick = (e) => {
  if (textDownward === true) {
    textDownward = false;
    e.target.classList.add("grey");
  } else {
    textDownward = true;
    e.target.classList.remove("grey");
  }
};
