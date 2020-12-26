var Plotly = require("plotly.js-dist");

var layout = {
  // showlegend: false,
  margin: {
    l: 40,
    r: 0,
    t: 40,
    b: 40,
  },
  xaxis: {
    autorange: true,
    rangeslider: { range: [0] },
    type: "linear",
  },
};

var config = {
  responsive: true,
  displayModeBar: true,
  scrollZoom: true,
  displaylogo: false,
  dragmode: "pan",
};

function rand() {
  return 1000000 * Math.random();
}

Plotly.newPlot(
  "chart",
  [
    {
      y: [1, 2, 3].map(rand),
      mode: "lines+markers",
    },
    {
      y: [1, 2].map(rand),
      mode: "lines+markers",
    },
  ],
  layout,
  config
);

var cnt = 0;
var interval = setInterval(function () {
  Plotly.extendTraces(
    "chart",
    {
      y: [[rand()], [rand()]],
    },
    [0, 1]
  );

  cnt = cnt + 1;
  if (cnt === 1000) clearInterval(interval);
}, 500);
