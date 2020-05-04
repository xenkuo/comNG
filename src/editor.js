/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const fs = require("fs");
const path = require("path");
const amdLoader = require("../node_modules/monaco-editor/min/vs/loader.js");
const { dialog } = require("electron").remote;

const amdRequire = amdLoader.require;
const hexmodeUnitWidth = 8;

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
var hexmodeIndex = 0;
var hexmodeUnitIndex = 0;
var breakpointHit = false;
var breakpointAfterLines = 0;
var breakpointBuff = [];
var half_line = false;
var decoIndex = 0;

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

function decoApply(m, text) {
  let matches = m.findMatches(
    text,
    false,
    false,
    true,
    "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
    false
  );
  let decoration = decoGet();

  console.log(decoration.style, decoration.color);

  for (let i of matches) {
    let range = i.range;

    m.deltaDecorations(
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

function decoRemove(m, text) {
  let matches = m.findMatches(
    text,
    false,
    false,
    true,
    "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
    false
  );

  for (let match of matches) {
    let decos = m.getDecorationsInRange(match.range);

    // super word remove decoration will cause sub word decoration to 1
    for (let deco of decos) {
      m.deltaDecorations([deco.id], []);
    }
  }
}

function highlightToggle() {
  console.log("highligh toggle");
  let decoExpectedLength = 1;
  let m = editor.getModel();
  let range = editor.getSelection();
  let text = m.getValueInRange(range);
  if (text === "") {
    let word = m.getWordAtPosition(editor.getPosition());
    text = word.word;
    range.startColumn = word.startColumn;
    range.endColumn = word.endColumn;
    decoExpectedLength = 2;
  }

  if (text === "") return;

  let decos = m.getDecorationsInRange(range);
  if (decos.length === decoExpectedLength) {
    decoApply(m, text);
  } else {
    decoRemove(m, text);
  }

  return null;
}

function openFile() {
  dialog
    .showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "comNG log", extensions: ["cnl", "txt"] }],
    })
    .then((result) => {
      if (result.canceled === false) {
        const file = result.filePaths[0];
        const text = fs.readFileSync(file).toString();
        editor.getModel().setValue(text);
      }
    });
}

function saveToFile() {
  let fileName = new Date(+new Date() + 8 * 3600 * 1000);
  fileName = "Log-" + fileName.toISOString();
  fileName = fileName.replace(/[.|:]/g, "-");
  if (config.advance.sign.switch === true && config.advance.sign.name !== "")
    fileName += "-" + config.advance.sign.name;

  dialog
    .showSaveDialog({
      properties: ["createDirectory"],
      defaultPath: fileName,
      filters: [{ name: "comNG Log", extensions: ["cnl"] }],
    })
    .then((result) => {
      if (result.canceled === false) {
        const file = result.filePath;
        const text = editor.getModel().getValue();
        fs.writeFileSync(file, text);
      }
    });
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

function editorAppend(text) {
  const lineCount = editor.getModel().getLineCount();
  const lastLineLength = editor.getModel().getLineMaxColumn(lineCount);

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
      text: text.toString(),
    },
  ]);

  editor.revealLine(editor.getModel().getLineCount());
}

function buff2hex(buff) {
  return Array.prototype.map
    .call(new Uint8Array(buff), (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}

function showHex(buff) {
  let hexBuff = buff2hex(buff);

  while (hexBuff.length !== 0) {
    let len = hexmodeUnitWidth - hexmodeIndex;
    if (hexBuff.length < len) len = hexBuff.length;
    let line = hexBuff.slice(0, len);

    hexmodeIndex = (hexmodeIndex + len) % hexmodeUnitWidth;
    if (hexmodeIndex === 0) {
      hexmodeUnitIndex++;
      if (hexmodeUnitIndex === 4) {
        hexmodeUnitIndex = 0;
        line += "\n";
      } else {
        line += " ";
      }
    }
    editorAppend(line);

    hexBuff = hexBuff.slice(len, hexBuff.length);
  }
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

function processSerialData(buff) {
  if (config.general.hexmode === true) {
    showHex(buff);
  } else {
    let index = -1;
    // console.log(buff)
    // console.log(buff.toString())
    while ((index = buff.indexOf("\n")) !== -1) {
      let line = buff.slice(0, index + 1);
      // console.log(line)

      if (half_line === true) {
        editorAppend(line);
        half_line = false;
      } else {
        let timestamp = "";

        if (config.general.timestamp === true) timestamp = getTimestamp();
        editorAppend(timestamp + line);
      }
      buff = buff.slice(index + 1, buff.length);
      // console.log(buff)

      if (config.advance.breakpoint.switch === true) {
        if (breakpointProcess(line) === true) {
          buff = [];
          serialClose();
        }
      }
    }
    if (buff.length !== 0) {
      if (half_line === false) {
        let timestamp = "";

        if (config.general.timestamp === true) timestamp = getTimestamp();
        editorAppend(timestamp + buff);
        half_line = true;
      } else {
        editorAppend(buff);
      }
    }
    if (config.advance.breakpoint.switch === true) {
      breakpointBuff = buff;
    }
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
    theme: "comNGTheme",
    language: "comNGLang",
    automaticLayout: true,
    readOnly: true,
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
    lineNumbersMinChars: 3,
    minimap: {
      enabled: false,
    },
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
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_E],
    precondition: null,
    keybindingContext: null,
    contextMenuGroupId: "9_cutcopypaste",
    contextMenuOrder: 1.5,
    run: highlightToggle,
  });

  // editor.addAction({
  //   id: "open-file",
  //   label: "Open File...",
  //   keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_O],
  //   precondition: null,
  //   keybindingContext: null,
  //   contextMenuGroupId: "9_cutcopypaste",
  //   contextMenuOrder: 1.5,
  //   run: dummy,
  // });

  // editor.addAction({
  //   id: "save-to-file",
  //   label: "Save To File...",
  //   keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
  //   precondition: null,
  //   keybindingContext: null,
  //   contextMenuGroupId: "9_cutcopypaste",
  //   contextMenuOrder: 1.5,
  //   run: dummy,
  // });

  editor.addCommand(monaco.KeyMod.CtrlCmd + monaco.KeyCode.KEY_W, () => {
    // Do nothing but prevent default action: close window
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd + monaco.KeyCode.KEY_X, () => {
    // Do nothing but prevent default action: close window
  });
});

document.getElementById("clear-btn").onclick = () => {
  let value = "";

  if (config.advance.sign.switch === true) {
    value = "Captured at " + new Date().toLocaleString() + " with comNG";
    if (config.advance.sign.name !== "")
      value += " by " + config.advance.sign.name + ".";
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
