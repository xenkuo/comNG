const Plotly = require("plotly.js-dist");

const chartEl = document.getElementById("chart");
const rangeShiftThreshold = 200;
var rangeCnt = 0;

const chartLayout = {
  // showlegend: false,
  width: window.innerWidth - 20,
  margin: {
    l: 40,
    r: 0,
    t: 40,
    b: 40,
  },
  xaxis: {
    rangeslider: {},
  },
  dragmode: "pan",
};

const chartConfig = {
  responsive: true,
  displayModeBar: true,
  scrollZoom: true,
  displaylogo: false,
};

function traceAppend() {
  Plotly.extendTraces(
    chartEl,
    {
      y: [[randGen()], [randGen()]],
    },
    [0, 1]
  );

  rangeCnt++;
  if (rangeCnt > rangeShiftThreshold) {
    Plotly.relayout(chartEl, {
      xaxis: {
        range: [rangeCnt - rangeShiftThreshold, rangeCnt],
        rangeslider: {},
      },
    });
  }
}

function randGen() {
  let x = Math.random();
  if (x < 0.9) {
    return x * 10;
  }

  return x * 1000;
}

Plotly.newPlot(
  chartEl,
  [
    {
      y: [1, 2, 3].map(randGen),
      mode: "lines",
    },
    {
      y: [1, 2].map(randGen),
      mode: "lines",
    },
  ],
  chartLayout,
  chartConfig
);

var interval = setInterval(() => {
  traceAppend();
  if (rangeCnt > 1000) clearInterval(interval);
}, 100);
