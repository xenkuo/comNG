var Plotly = require("plotly.js-dist");

var d1 = {
  x: [1, 2, 3, 4, 5, 6],
  y: [10, 15, 13, 17, 20, 13],
  mode: "lines + markers",
};

var d2 = {
  x: [2, 3, 4, 5, 6, 7],
  y: [16, 5, 11, 9, 8, 10],
  mode: "lines",
};

var data = [d1, d2];

var layout = {
  // showlegend: false,
  margin: {
    l: 20,
    r: 0,
    t: 40,
    b: 40,
  },
  dragmode: "pan",
};
var config = {
  responsive: true,
  displayModeBar: true,
  scrollZoom: true,
  displaylogo: false,
};

Plotly.newPlot("myDiv", data, layout, config);
