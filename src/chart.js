const Plotly = require("plotly.js-dist");

const chartEl = document.getElementById("chart");
const rangeShiftThreshold = 200;
var rangeCnt = 0;

var ChannelCount = 0;
var channelData = [];

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

function traceAppend(data, indices) {
  Plotly.extendTraces(
    chartEl,
    {
      y: data,
    },
    // [0, -1]
    indices
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
  return Math.random();
}

var interval;
document.getElementById("chart-switch").onclick = (e) => {
  if (e.target.checked === true) {
    Plotly.newPlot(chartEl, channelData, chartLayout, chartConfig);

    interval = setInterval(() => {
      var data = [];
      var indices = [];
      for (let i = 0; i < ChannelCount; i++) {
        data.push([randGen()]);
        indices.push(i);
      }
      traceAppend(data, indices);
    }, 100);
  } else {
    clearInterval(interval);
  }
};

document.getElementById("chart-channel-select").onchange = () => {
  ChannelCount = document.getElementById("chart-channel-select").value;

  let channelDataTmp = [];
  for (let i = 0; i < ChannelCount; i++) {
    channelDataTmp.push({ y: [0] });
  }

  channelData = channelDataTmp;
};
