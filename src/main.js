const { app, BrowserWindow } = require("electron");
const path = require("path");
const Shortcut = require("electron-localshortcut");

const Store = require("electron-store");

const store = new Store();

const widthDefault = 600;
const widthMin = 600;
const widthMax = 1024;
const heightDefault = 640;
const heightMin = 400;
const heightMax = 768;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const createWindow = () => {
  let width = store.get("window.width", widthDefault);
  let height = store.get("window.height", heightDefault);

  if (width > widthMax) width = widthMax;
  if (height > heightMax) height = heightMax;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: width,
    minWidth: widthMin,
    height: height,
    minHeight: heightMin,
    frame: false,
    icon: path.join(__dirname, "../image/logo.png"),
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, "./preload.js"),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  mainWindow.on("restore", () => {
    mainWindow.setContentSize(
      store.get("window.width", widthDefault),
      store.get("window.height", heightDefault)
    );
  });

  Shortcut.register(mainWindow, "CmdOrCtrl+X", () => {
    console.log("Pressed cmd/ctrl x");
    mainWindow.webContents.send("main-cmd", "ClearLog");
  });

  Shortcut.register(mainWindow, "CmdOrCtrl+D", () => {
    console.log("Pressed cmd/ctrl d");
    mainWindow.webContents.send("main-cmd", "SwitchPort");
  });

  Shortcut.register(mainWindow, "CmdOrCtrl+Shift+D", () => {
    console.log("Pressed cmd/ctrl shift d");
    mainWindow.webContents.send("main-cmd", "ClearLog&SwitchPort");
  });

  Shortcut.register(mainWindow, "CmdOrCtrl+O", () => {
    console.log("Pressed cmd/ctrl o");
    mainWindow.webContents.send("main-cmd", "OpenFile");
  });

  Shortcut.register(mainWindow, "CmdOrCtrl+Shift+O", () => {
    console.log("Pressed cmd/ctrl shift o");
    mainWindow.webContents.send("main-cmd", "OpenBinFile");
  });

  Shortcut.register(mainWindow, "CmdOrCtrl+S", () => {
    console.log("Pressed cmd/ctrl s");
    mainWindow.webContents.send("main-cmd", "SaveFile");
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
