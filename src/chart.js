const Plotly = require("plotly.js-basic-dist-min");

const chartEl = document.getElementById("chart");
const frameShiftThreshold = 100;
var chartEnable = false;
var frameCount = 0;
var frameBuffer = [];

var channelCount = 2;
var channelData = [{}];
const chartConfig = {
  responsive: true,
  displayModeBar: true,
  scrollZoom: true,
  displaylogo: false,
};

var chartLayout = {
  // showlegend: false,
  width: window.innerWidth - 20,
  margin: {
    l: 40,
    r: 0,
    t: 40,
    b: 20,
  },
  xaxis: {
    range: [0, 100],
  },
  dragmode: "pan",
};

resetChart();

function channelDataReset() {
  frameBuffer = [];
  channelData = [channelCount];
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

  return { frame, indices };
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
      },
    });
  }
}

function resetChart() {
  // reset state
  Plotly.purge(chartEl);
  frameCount = 0;
  chartLayout.xaxis.range = [0, 100];
  channelDataReset();

  // create new plot
  Plotly.newPlot(chartEl, channelData, chartLayout, chartConfig);
}
// var interval;
document.getElementById("chart-switch").onclick = (e) => {
  if (e.target.checked === true) {
    chartEnable = true;
    Plotly.newPlot(chartEl, channelData, chartLayout, chartConfig);
  } else {
    chartEnable = false;
  }
};

document.getElementById("chart-clean").onclick = () => resetChart();

function arrayAppend(array, length) {
  let { frame, indices } = array2frame(array, length);
  frameAppend(frame, indices);
}

function chartFrameProcess(buffer) {
  if (false === chartEnable) return;

  frameBuffer += buffer;

  let index = -1;
  while ((index = frameBuffer.indexOf("\n")) !== -1) {
    let frame = frameBuffer.slice(0, index + 1);
    let frameArray = frame.toString().trim().split(" ");
    if ("NGF" === frameArray[0]) {
      frameArray = frameArray.slice(1, frameArray.length);
      if (frameArray.length !== channelCount) {
        channelCount = frameArray.length;
        channelDataReset();

        Plotly.newPlot(chartEl, channelData, chartLayout, chartConfig);
      }
      arrayAppend(frameArray, frameArray.length);
    }

    frameBuffer = frameBuffer.slice(index + 1, frameBuffer.length);
  }
}
