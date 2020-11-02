/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const fs = require("fs");
const path = require("path");
const amdLoader = require("../node_modules/monaco-editor/min/vs/loader.js");
const { dialog } = require("electron").remote;
const hexy = require("hexy");
const ChromeTabs = require("chrome-tabs");

const amdRequire = amdLoader.require;

const hmUnitCount = 16;
const hmUnitBytes = 2;
const hmUnitSpanLength = 1;
const hmUnitLength = hmUnitBytes + hmUnitSpanLength; // 3

const hmAddrOffset = 1;
const hmAddrLength = 10;
const hmHexOffset = hmAddrOffset + hmAddrLength; // 11
const hmHexLength = hmUnitLength * hmUnitCount; // 16 * 3 = 48
const hmSpanOffset = hmHexOffset + hmHexLength; // 59
const hmSpanLength = 3;
const hmStrOffset = hmSpanOffset + hmSpanLength; // 62
const hmStrLength = 16;
const hmEofOffset = hmStrOffset + hmStrLength; // 78

const decoMod = 7;
const decoTable = [
  { style: "hl-red", color: "#ff8a80" },
  { style: "hl-orange", color: "#ffd180" },
  { style: "hl-yellow", color: "#ffff8d" },
  { style: "hl-green", color: "#b9f6ca" },
  { style: "hl-blue", color: "8dd8ff" },
  { style: "hl-indigo", color: "8c9eff" },
  { style: "hl-purple", color: "ea80fc" },
];

var editor;
var chromeTabs = new ChromeTabs();
var breakpointHit = false;
var breakpointAfterLines = 0;
var breakpointBuff = [];
var half_line = false;
var decoIndex = 0;
var ansiWait = false;
var captureFileStream;

// tabEl -> view
// view -> {model, state}
var tabsMap = new Map();

function uriFromPath(_path) {
  var pathName = path.resolve(_path).replace(/\\/g, "/");
  if (pathName.length > 0 && pathName.charAt(0) !== "/") {
    pathName = "/" + pathName;
  }
  return encodeURI("file://" + pathName);
}

function decoGet() {
  return decoTable[decoIndex++ % decoMod];
}

function decoApply(model, text) {
  let matches = model.findMatches(
    text,
    false,
    false,
    true,
    // "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
    null,
    false
  );
  let decoration = decoGet();

  console.log(decoration.style, decoration.color);

  for (let i of matches) {
    let range = i.range;

    model.deltaDecorations(
      [],
      [
        {
          range: range,
          options: {
            className: decoration.style,
            overviewRuler: {
              color: decoration.color,
              position: 4, // position right
            },
          },
        },
      ]
    );
  }
}

function decoRemoveOld(model, text) {
  let matches = model.findMatches(
    text,
    false,
    false,
    true,
    // "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
    null,
    false
  );

  for (let match of matches) {
    let decos = model.getDecorationsInRange(match.range);

    // super word remove decoration will cause sub word decoration to 1
    for (let deco of decos) {
      model.deltaDecorations([deco.id], []);
    }
  }
}

function decoRemove(model, targetClassName) {
  let decos = model.getAllDecorations();

  for (let deco of decos) {
    if (targetClassName === deco.options.className) {
      model.deltaDecorations([deco.id], []);
    }
  }
}

function highlightToggle() {
  console.log("highligh toggle");
  let model = editor.getModel();
  let range = editor.getSelection();
  let text = model.getValueInRange(range);
  if (text === "") {
    let word = model.getWordAtPosition(editor.getPosition());
    if (null === word) text = "";
    else {
      text = word.word;
      range.startColumn = word.startColumn;
      range.endColumn = word.endColumn;
    }
  }

  if (text === "") return;

  let applyDeco = 1;
  let targetClassName = "";
  let targetzIndex = 0;
  let decos = model.getDecorationsInRange(range);
  for (let deco of decos) {
    if (
      deco.options.className !== null &&
      deco.options.className.indexOf("hl-") !== -1
    ) {
      applyDeco = 0;
      if (targetzIndex === 0) {
        targetzIndex = deco.options.zIndex;
        targetClassName = deco.options.className;
      } else {
        if (deco.options.zIndex > targetzIndex) {
          targetzIndex = deco.options.zIndex;
          targetClassName = deco.options.className;
        }
      }
    }
  }
  if (1 === applyDeco) {
    decoApply(model, text);
  } else {
    decoRemove(model, targetClassName);
  }
  return null;
}

function hightlightClearAll() {
  console.log("highlight clear all");

  let model = editor.getModel();
  let decos = model.getAllDecorations();

  for (let deco of decos) {
    if (deco.options.className === null) continue;
    if (
      deco.options.className.indexOf("hl-") !== -1 ||
      deco.options.className === "hex-cursor"
    ) {
      model.deltaDecorations([deco.id], []);
    }
  }
}

function openFile() {
  dialog
    .showOpenDialog({
      properties: ["openFile"],
    })
    .then((result) => {
      if (result.canceled === false) {
        const path = result.filePaths[0];
        // show text
        const text = fs.readFileSync(path).toString();
        editor.getModel().setValue(text);

        // setup tab
        const title = path.split(/[\\|/]/).pop();
        const el = chromeTabs.activeTabEl;
        // 1. setup filepath
        tabsMap.get(el).path = path;
        // 2. setup title
        let titleEl = el.querySelector(".chrome-tab-title");
        el.align = "center";
        titleEl.innerHTML = title;
      }
    });
}

function openBinFile() {
  if (true !== config.general.hexmode) {
    toast("Please first enable 'Hex Mode' in General tab.");
    return;
  }

  dialog
    .showOpenDialog({
      properties: ["openFile"],
    })
    .then((result) => {
      if (result.canceled === false) {
        // show hex text
        editor.getModel().setValue("");
        fs.readFile(path, (e, data) => {
          if (e) throw err;
          showHex(data, false);
        });

        // setup tab
        const title = path.split(/[\\|/]/).pop();
        const el = chromeTabs.activeTabEl;
        // 1. setup filepath
        tabsMap.get(el).path = path;
        // 2. setup title
        let titleEl = el.querySelector(".chrome-tab-title");
        el.align = "center";
        titleEl.innerHTML = title;
      }
    });
}

function saveToFile() {
  const el = chromeTabs.activeTabEl;
  const view = tabsMap.get(el);
  if (view.path !== null) {
    // has path info
    const text = editor.getModel().getValue();
    fs.writeFileSync(view.path, text);
  } else {
    // no path info
    const fileName = chromeTabs.activeTabEl.innerText;

    dialog
      .showSaveDialog({
        properties: ["createDirectory"],
        defaultPath: fileName + ".log",
        filters: [{ extensions: ["log"] }],
      })
      .then((result) => {
        if (result.canceled === false) {
          // save to file
          const path = result.filePath;
          const text = editor.getModel().getValue();
          fs.writeFileSync(path, text);
          // update tab's path
          view.path = path;
        }
      });
  }
}

function newTab() {
  chromeTabs.addTab();
}

function getTimestamp() {
  const t = new Date();

  return (
    t.toLocaleTimeString().split(" ")[0] +
    ":" +
    t.getMilliseconds().toString().padStart(3, 0) +
    " "
  );
}

function editorApplyEdit(textString, appendLine, revealLine) {
  const model = editor.getModel();
  const lineCount = model.getLineCount();
  let lastLineLength = 1;
  if (true === appendLine) {
    lastLineLength = model.getLineMaxColumn(lineCount);
  }

  const range = new monaco.Range(
    lineCount,
    lastLineLength,
    lineCount,
    lastLineLength
  );

  editor.getModel().applyEdits([
    {
      forceMoveMarkers: true,
      range: range,
      text: textString,
    },
  ]);

  if (undefined !== captureFileStream) {
    captureFileStream.write(textString);
  }

  if (true === revealLine && textDownward === true)
    editor.revealLine(model.getLineCount());
}

function showHex(buffer, revealLine) {
  const text = hexy.hexy(buffer, { format: "twos" });
  const model = editor.getModel();
  const lineCount = model.getLineCount();

  editorApplyEdit(text, false, revealLine);
}

function breakpointProcess(line) {
  if (breakpointHit === false) {
    let bpLine = line;

    if (breakpointBuff.length !== 0) {
      bpLine = Buffer.concat(
        [breakpointBuff, line],
        line.length + breakpointBuff.length
      );
      breakpointBuff = [];
    }

    if (bpLine.includes(config.advance.breakpoint.onText) === true) {
      breakpointHit = true;
      breakpointAfterLines = 0;
    }
  } else {
    breakpointAfterLines++;
    if (breakpointAfterLines >= config.advance.breakpoint.afterLines) {
      breakpointHit = false;
      breakpointAfterLines = 0;

      return true;
    }
  }

  return false;
}

function filterAnsiCode(inBuffer) {
  let inArray = [...inBuffer];
  let outArray = [];
  let arrayLen = inArray.length;

  for (let i = 0; i < arrayLen; i++) {
    if (ansiWait === false) {
      if (0x1b !== inArray[i]) {
        // \u001b
        outArray.push(inArray[i]);
      } else {
        ansiWait = true;
      }
    } else {
      if (0x6d === inArray[i]) {
        // m
        ansiWait = false;
      }
    }
  }

  return Buffer.from(outArray);
}

function showString(inBuffer) {
  // 1. trim ansi escape codes
  let buffer = filterAnsiCode(inBuffer);

  // 2. output full line
  let index = -1;
  let outputTmp = buffer;
  while ((index = buffer.indexOf("\n")) !== -1) {
    let line = buffer.slice(0, index + 1);

    if (half_line === true) {
      outputTmp = line;
      half_line = false;
    } else {
      let timestamp = "";

      if (config.general.timestamp === true) timestamp = getTimestamp();
      outputTmp = timestamp + line;
    }
    editorApplyEdit(
      outputTmp.toString().replace(/[^\x20-\x7E\n\r\t]/g, "."),
      true,
      true
    );

    buffer = buffer.slice(index + 1, buffer.length);

    if (config.advance.breakpoint.switch === true) {
      if (breakpointProcess(line) === true) {
        buffer = Buffer.from("");
        serialClose();
      }
    }
  }

  // 3. output partial line
  if (buffer.length !== 0) {
    if (half_line === true) {
      outputTmp = buffer;
    } else {
      let timestamp = "";

      if (config.general.timestamp === true) timestamp = getTimestamp();
      outputTmp = timestamp + buffer;
      half_line = true;
    }
    editorApplyEdit(
      outputTmp.toString().replace(/[^\x20-\x7E\n\r\t]/g, "."),
      true,
      true
    );
  }
  if (config.advance.breakpoint.switch === true) {
    breakpointBuff = buffer;
  }
}

amdRequire.config({
  // eslint-disable-next-line no-undef
  baseUrl: uriFromPath(
    path.join(__dirname, "../node_modules/monaco-editor/min")
  ),
});

// workaround monaco-css not understanding the environment
self.module = undefined;

amdRequire(["vs/editor/editor.main"], function () {
  monaco.languages.register({
    id: "comNGLang",
  });
  monaco.languages.setMonarchTokensProvider("comNGLang", {
    defaultToken: "",

    tokenizer: {
      root: [
        [/^\[?[f|F][a|A][t|T][a|A][l|L]\]?\s.*/, "fatal"],
        [/\s+\[?[f|F][a|A][t|T][a|A][l|L]\]?\s+/, "fatal"],
        [/^\[?F\]?\s.*/, "fatal"],
        [/\s+\[?F\]?\s+/, "fatal"],
        [/^\[?[e|E][r|R][r|R][o|O][r|R]\]?\s.*/, "error"],
        [/\s+\[?[e|E][r|R][r|R][o|O][r|R]\]?\s+/, "error"],
        [/^\[?E\]?\s.*/, "error"],
        [/\s+\[?E\]?\s+/, "error"],
        [/^\[?[w|W][a|A][r|R][n|N]\]?\s.*/, "warn"],
        [/\s+\[?[w|W][a|A][r|R][n|N]\]?\s+/, "warn"],
        [/^\[?W\]?\s.*/, "warn"],
        [/\s+\[?W\]?\s+/, "warn"],
        [/^\[?[i|I][n|N][f|F][o|O]\]?\s.*/, "info"],
        [/\s+\[?[i|I][n|N][f|F][o|O]\]?\s+/, "info"],
        [/^\[?I\]?\s.*/, "info"],
        [/\s+\[?I\]?\s+/, "info"],
        [/^\[?[t|T][r|R][a|A][c|C][e|E]\]?\s.*/, "trace"],
        [/\s+\[?[t|T][r|R][a|A][c|C][e|E]\]?\s+/, "trace"],
        [/^\[?T\]?\s.*/, "trace"],
        [/\s+\[?T\]?\s+/, "trace"],
        [/^\[?[d|D][e|E][b|B][u|U][g|G]\]?\s.*/, "debug"],
        [/\s+\[?[d|D][e|E][b|B][u|U][g|G]\]?\s+/, "debug"],
        [/^\[?D\]?\s.*/, "debug"],
        [/\s+\[?D\]?\s+/, "debug"],

        [/\[\d;\d{2}m/, "useless"],
        [/\[\dm/, "useless"],

        [/[{}()[\]]/, "bracket"],
        [/^\d{1,2}:\d{2}:\d{2}:\d{1,3}/, "timestamp"],
        [/\d{1,4}(-|\/|\.|:)\d{1,2}\1\d{1,4}/, "time"],
        [
          /(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)(-|\/|\.|:)(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)\2(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)\2(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)/,
          "ip",
        ],
        [
          /[0-9a-fA-F]{2}(-|\/|\.|:)[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}/,
          "mac",
        ],
        [/\d*\.\d+([eE][-+]?\d+)?/, "number"],
        [/0[xX][0-9a-fA-F]+/, "number"],
        [/[0-9a-fA-F]{4,}/, "number"],
        [/\d+/, "number"],
      ],
    },
  });

  // Define a new theme that contains only rules that match this language
  monaco.editor.defineTheme("comNGTheme", {
    base: "vs",
    inherit: false,
    colors: {
      "editor.background": "#fafafa",
      "scrollbarSlider.background": "#fafafa",
    },
    rules: [
      { token: "number", foreground: "2e7d32" },
      { token: "bracket", foreground: "ff9800" },
      { token: "timestamp", foreground: "009688" },
      { token: "time", foreground: "2196f3" },
      { token: "ip", foreground: "03a9f4" },
      { token: "mac", foreground: "00bcd4" },
      { token: "fatal", foreground: "e91e63" },
      { token: "error", foreground: "f44336" },
      { token: "warn", foreground: "ff9800" },
      { token: "info", foreground: "9e9e9e" },
      { token: "trace", foreground: "9e9d24" },
      { token: "debug", foreground: "2e7d32" },
      { token: "useless", foreground: "cecece" },
    ],
  });

  editor = monaco.editor.create(document.getElementById("editor-area"), {
    model: null,
    theme: "comNGTheme",
    language: "comNGLang",
    automaticLayout: true,
    // readOnly: true,
    folding: false,
    fontFamily: config.general.fontFamily,
    fontSize: config.general.fontSize,
    overviewRulerBorder: false,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    mouseWheelZoom: true, // combined with Ctrl
    wordWrap: "on",
    wordWrapBreakAfterCharacters: "",
    wordWrapBreakBeforeCharacters: "",
    lineNumbersMinChars: 4,
    // minimap: {
    //   enabled: false,
    // },
    scrollbar: {
      vertical: "auto",
      useShadows: false,
      verticalScrollbarSize: 10,
    },
  });

  let editorConfig = {
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
      ['"', '"'],
      ["'", "'"],
    ],
  };
  monaco.languages.setLanguageConfiguration("comNGLang", editorConfig);

  editor.addAction({
    id: "highlight-toggle",
    label: "Highlight Toggle",
    keybindings: [monaco.KeyMod.CtrlCmd + monaco.KeyCode.KEY_E],
    precondition: null,
    keybindingContext: null,
    contextMenuGroupId: "9_cutcopypaste",
    contextMenuOrder: 1.5,
    run: highlightToggle,
  });

  editor.addAction({
    id: "highlight-clear-all",
    label: "Highlight Clear All",
    keybindings: [
      monaco.KeyMod.CtrlCmd + monaco.KeyMod.Shift + monaco.KeyCode.KEY_X,
    ],
    precondition: null,
    keybindingContext: null,
    contextMenuGroupId: "9_cutcopypaste",
    contextMenuOrder: 1.5,
    run: hightlightClearAll,
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd + monaco.KeyCode.KEY_W, () => {
    // Do nothing but prevent default action: close window
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd + monaco.KeyCode.KEY_X, () => {
    // Do nothing but prevent default action: close window
  });

  function getLinePairRange(range) {
    let s = range.startColumn;
    if (s <= hmSpanOffset) {
      // hex area
      if (s < hmHexOffset) s = range.startColumn = hmHexOffset;
      s = Math.round((s - hmHexOffset) / hmUnitLength) + hmStrOffset;
    } else {
      // str area
      if (s < hmStrOffset) s = range.startColumn = hmStrOffset;
      s = (s - hmStrOffset) * hmUnitLength + hmHexOffset;
    }

    let e = range.endColumn;
    if (e <= hmStrOffset) {
      // hex area
      if (e < hmHexOffset) e = range.endColumn = hmHexOffset;
      if (e > hmSpanOffset) e = range.endColumn = hmSpanOffset;
      e = Math.round((e - hmHexOffset) / hmUnitLength) + hmStrOffset;
    } else {
      // str area
      if (e < hmStrOffset) e = range.endColumn = hmStrOffset;
      e = (e - hmStrOffset) * hmUnitLength + hmHexOffset;
    }

    return new monaco.Range(range.startLineNumber, s, range.startLineNumber, e);
  }

  function showCursors(model, range) {
    let cordRange = getLinePairRange(range);
    if (undefined === cordRange) return;

    // first remove old decos
    let decos = model.getLineDecorations(range.startLineNumber);
    for (let deco of decos) {
      if (deco.options.className === "hex-cursor") {
        model.deltaDecorations([deco.id], []);
      }
    }

    model.deltaDecorations(
      [],
      [
        {
          range: range,
          options: {
            className: "hex-cursor",
            zIndex: 999,
          },
        },
        {
          range: cordRange,
          options: {
            className: "hex-cursor",
            zIndex: 999,
            overviewRuler: {
              color: "#f06292",
              position: 4, // 2: center, 4: right, 1: left, 7: full
            },
          },
        },
      ]
    );
  }

  function selectRanges(model, range, pairRange, decoration) {
    // first remove old decos
    let decos = model.getLineDecorations(range.startLineNumber);
    let zIndex = 1;
    for (let deco of decos) {
      if (
        deco.options.className !== null &&
        deco.options.className.indexOf("hl-") !== -1
      ) {
        if (deco.options.zIndex >= zIndex) zIndex = deco.options.zIndex + 1;
      }
    }

    // then apply new decos
    model.deltaDecorations(
      [],
      [
        {
          range: range,
          options: {
            className: decoration.style,
            zIndex: zIndex,
          },
        },
        {
          range: pairRange,
          options: {
            className: decoration.style,
            zIndex: zIndex,
            overviewRuler: {
              color: decoration.color,
              position: 4, // 2: center, 4: right, 1: left, 7: full
            },
          },
        },
      ]
    );
  }

  function extracLineRange(range, line) {
    let s = (e = 1);

    if (line === range.startLineNumber) {
      s = range.startColumn;
      if (s <= hmSpanOffset) {
        // hex area
        if (range.startLineNumber !== range.endLineNumber) e = hmSpanOffset;
        else e = range.endColumn;
      } else {
        // str area
        if (range.startLineNumber !== range.endLineNumber) e = hmEofOffset;
        else e = range.endColumn;
      }
    } else if (line === range.endLineNumber) {
      e = range.endColumn;
      if (e <= hmStrOffset) {
        // hex area
        if (range.startLineNumber !== range.endLineNumber) s = hmHexOffset;
        else s = range.startColumn;
      } else {
        // str area
        if (range.startLineNumber !== range.endLineNumber) s = hmStrOffset;
        else
          s = range.startColumn > hmStrOffset ? range.startColumn : hmStrOffset;
      }
    } else {
      // default hex area
      s = hmHexOffset;
      e = hmSpanOffset;
    }

    return new monaco.Range(line, s, line, e);
  }

  editor.onMouseUp(() => {
    if (false === config.general.hexmode) return;

    let model = editor.getModel();
    let range = editor.getSelection();
    console.log("In: " + range);

    if (range.isEmpty() === true) {
      showCursors(model, range);
    } else {
      let deco = decoGet();
      for (
        let line = range.startLineNumber;
        line <= range.endLineNumber;
        line++
      ) {
        let lineRange = extracLineRange(range, line);
        let linePairRange = getLinePairRange(lineRange);
        selectRanges(model, lineRange, linePairRange, deco);
      }
    }
  });

  // Chrometabs section, refer to:
  // https://stackoverflow.com/questions/38266951/how-to-create-chrome-like-tab-on-electron
  let tabsEl = document.querySelector(".chrome-tabs");

  tabsEl.addEventListener("tabAdd", ({ detail }) => {
    // console.log("tab add");

    // create a new model
    let model = monaco.editor.createModel();
    editor.setModel(model);
    monaco.editor.setTheme("comNGTheme");
    monaco.editor.setModelLanguage(model, "comNGLang");

    let el = detail.tabEl;
    // setup the title with time
    let date = new Date();
    date = date.toString().split(" ");
    let title = date[0] + "-" + date[4].replace(/[.|:]/g, "-");
    let titleEl = el.querySelector(".chrome-tab-title");
    el.align = "center";
    titleEl.innerHTML = title;

    // setup the map between table and model/state
    let view = {
      model: model,
      path: null,
      state: null,
    };
    tabsMap.set(el, view);
  });

  tabsEl.addEventListener("activeTabChange", ({ detail }) => {
    // console.log("tab change");
    let el = detail.tabEl;

    // Save before tab's state
    let model = editor.getModel();
    tabsMap.forEach((view, _) => {
      if (model === view.model) {
        view.state = editor.saveViewState();
      }
    });

    // Restore new tab's state
    let view = tabsMap.get(el);
    editor.setModel(view.model);
    editor.restoreViewState(view.state);
  });

  tabsEl.addEventListener("tabRemove", ({ detail }) => {
    // console.log("tab remove");
    tabsMap.delete(detail.tabEl);
    if (0 === tabsMap.size) chromeTabs.addTab();
  });

  chromeTabs.init(tabsEl);
  chromeTabs.addTab();
  document.getElementById("add-tab").onclick = () => {
    chromeTabs.addTab();
  };
});

document.getElementById("clear-btn").onclick = () => {
  let value = "";

  if (config.advance.sign.switch === true) {
    value =
      "------This file captured at " +
      new Date().toLocaleString() +
      " with comNG";
    if (config.advance.sign.name !== "")
      value += " by " + config.advance.sign.name + ".------";
    else value += ".------";
    value += "\n";
  }

  hexmodeIndex = 0;
  editor.getModel().setValue(value);
};

document.getElementById("editor-font-family").onblur = (e) => {
  let font = e.target.value.trim();

  if (font === "")
    font =
      "Consolas, 'SF Mono', Menlo, 'Lucida Console', 'Courier New', monospace";
  editor.updateOptions({ fontFamily: font });
  configUpdate("general.fontFamily", font);
};

document.getElementById("editor-font-size").onblur = (e) => {
  let size = e.target.value.trim();
  if (size === "") size = 12;

  editor.updateOptions({ fontSize: size });
  configUpdate("general.fontSize", size);
};

document.getElementById("breakpoint-switch").onclick = (e) => {
  if (e.target.checked === true) {
    if (config.advance.breakpoint.onText.length === 0) {
      toast("Error: Breakpoint on-text cant be empty");
      e.target.checked = false;
      return;
    }
  }

  configUpdate("advance.breakpoint.switch", e.target.checked);
  breakpointHit = false;
  breakpointAfterLines = 0;
};

document.getElementById("breakpoint-on-text").onblur = (e) => {
  configUpdate("advance.breakpoint.onText", e.target.value);
};

document.getElementById("breakpoint-after-lines").onblur = (e) => {
  let lines = parseInt(e.target.value);

  if (isNaN(lines) === true) lines = 5;
  configUpdate("advance.breakpoint.afterLines", lines);
};

document.getElementById("capture-file-switch").onclick = (e) => {
  if (e.target.checked === true) {
    let fileName = new Date();
    fileName = "Capture-" + fileName.toLocaleString();
    fileName = fileName.replace(/[:/, ]/g, "-");
    fileName = fileName.replace(/--/g, "-");

    if (config.advance.sign.switch === true && config.advance.sign.name !== "")
      fileName += "-by-" + config.advance.sign.name;

    dialog
      .showSaveDialog({
        properties: ["createDirectory"],
        defaultPath: fileName,
        filters: [{ name: "comNG Log", extensions: ["cnl"] }],
      })
      .then((result) => {
        let pathEle = document.getElementById("capture-file-path");
        if (result.canceled === false) {
          let path = result.filePath;
          pathEle.value = path;
          captureFileStream = fs.createWriteStream(path, { flags: "w" });

          configUpdate("fileops.capture.switch", true);
          configUpdate("fileops.capture.filePath", path);
        } else {
          if (undefined !== captureFileStream) captureFileStream.end();
          captureFileStream = undefined;
          pathEle.value = "";

          configUpdate("fileops.capture.switch", false);
          configUpdate("fileops.capture.filePath", "");

          // restore check status
          e.target.checked = false;
        }
      });
  } else {
    if (undefined !== captureFileStream) captureFileStream.end();
    captureFileStream = undefined;

    configUpdate("fileops.capture.switch", false);
  }
};

document.getElementById("capture-file-path").ondblclick = (e) => {
  const file = e.target.value;
  const text = fs.readFileSync(file).toString();
  editor.getModel().setValue(text);
};

document.getElementById("editor-area").ondragover = () => {
  return false;
};

document.getElementById("editor-area").ondragleave = () => {
  return false;
};

document.getElementById("editor-area").ondragend = () => {
  return false;
};

document.getElementById("editor-area").ondrop = (e) => {
  console.log("ondrop");
  e.preventDefault();

  let f = e.dataTransfer.files[0];

  f.text().then((text) => {
    editor.getModel().setValue(text);
  });

  return false;
};

function editorShowSerialData(buffer) {
  if (config.general.hexmode === true) {
    showHex(buffer, true);
  } else {
    showString(buffer);
  }
}

function editorStateReset() {
  breakpointHit = false;
  breakpointAfterLines = 0;
  breakpointBuff = [];
  half_line = false;
  decoIndex = 0;
  ansiWait = false;
}
