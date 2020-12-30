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
    b: 0,
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

const emptyTrace = {
  y: [0],
};

var chartData = [];
for (let i = 0; i < 2; i++) {
  chartData.push(emptyTrace);
}

function randGen() {
  return Math.random();
}

Plotly.newPlot(chartEl, chartData, chartLayout, chartConfig);

var interval = setInterval(() => {
  traceAppend();
  if (rangeCnt > 100) clearInterval(interval);
  if (rangeCnt > 100) {
    rangeCnt = 0;
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
  }
}, 100);
