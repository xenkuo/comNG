const Plotly = require("plotly.js-dist");

const chartEl = document.getElementById("chart");
const frameShiftThreshold = 100;
var frameCount = 0;

var channelCount = 0;
var channelData = [];
const chartConfig = {
  responsive: true,
  displayModeBar: true,
  scrollZoom: true,
  displaylogo: false,
};
const rangesliderLayout = {
  thickness: 0.1,
};

var chartLayout = {
  // showlegend: false,
  width: window.innerWidth - 20,
  margin: {
    l: 40,
    r: 0,
    t: 40,
    b: 4,
  },
  xaxis: {
    rangeslider: rangesliderLayout,
  },
  dragmode: "pan",
};

function channelCountUpdate() {
  channelCount = document.getElementById("chart-channel-select").value;
}

function channelDataReset() {
  for (let i = 0; i < channelCount; i++) {
    channelData[i] = { y: [0], mode: "lines" };
  }
}

function array2frame(array, length) {
  var frame = [];
  var indices = [];

  for (let i = 0; i < channelCount && i < length; i++) {
    frame.push([array[i]]);
    indices.push(i);
  }

  return { data: frame, indices };
}

function frameAppend(frame, indices) {
  Plotly.extendTraces(
    chartEl,
    {
      y: frame,
    },
    indices
  );

  frameCount++;
  if (frameCount > frameShiftThreshold) {
    Plotly.relayout(chartEl, {
      xaxis: {
        range: [frameCount - frameShiftThreshold, frameCount],
        rangeslider: rangesliderLayout,
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
    if (0 === channelCount) {
      channelCountUpdate();
      channelDataReset();
    }
    Plotly.newPlot(chartEl, channelData, chartLayout, chartConfig);

    interval = setInterval(() => {
      var array = [];
      for (let i = 0; i < channelCount; i++) {
        array.push(randGen() * i);
      }
      let { data: frame, indices } = array2frame(array, channelCount);
      frameAppend(frame, indices);
    }, 100);
  } else {
    clearInterval(interval);
  }
};

document.getElementById("chart-channel-select").onchange = () => {
  channelCountUpdate();
  channelDataReset();
};

document.getElementById("chart-clean").onclick = () => {
  // clear old state
  Plotly.purge(chartEl);
  frameCount = 0;
  chartLayout.xaxis.range = [0, 100];
  channelDataReset();

  // create new plot
  Plotly.newPlot(chartEl, channelData, chartLayout, chartConfig);
};
