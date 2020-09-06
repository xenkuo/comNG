// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

let pjson = require("../package.json");
if ("dev" == pjson.mode) {
  const fs = require("fs");
  let terser = require("terser");
  let options = {
    mangle: false,
    compress: false,
    sourceMap: {
      filename: "index.js",
      url: "index.js.map",
    },
  };
  let result = terser.minify(
    {
      "base.js": fs.readFileSync("./src/base.js", "utf8"),
      "editor.js": fs.readFileSync("./src/editor.js", "utf8"),
      "serialport.js": fs.readFileSync("./src/serialport.js", "utf8"),
    },
    options
  );
  fs.writeFileSync("./src/index.js", result.code, "utf8");
  fs.writeFileSync("./src/index.js.map", result.map, "utf8");
}
