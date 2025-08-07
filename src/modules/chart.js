const Plotly = require('plotly.js-basic-dist-min')
const chartEl = document.getElementById('chart-figure')

window.addEventListener('menuResized', () => {
  relayoutChart()
})
window.addEventListener('chartTabActivated', () => {
  resetChart()
})
window.addEventListener('serialDataCleanup', () => {
  resetChart()
})

const frameShiftThreshold = 100
const chartControl = {
  enable: false,
}
var frameCount = 0
var frameBuffer = []

var channelCount = 2
var channelData = [{}]
const plotConfig = {
  responsive: true,
  displayModeBar: true,
  scrollZoom: true,
  displaylogo: false,
}

const plotLayout = {
  // showlegend: false,
  margin: {
    l: 50,
    r: 50,
    b: 50,
    t: 50,
    pad: 0,
  },
  xaxis: {
    range: [0, 100],
  },
  font: {
    family:
      '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen-Sans, Ubuntu, Cantarell, Helvetica Neue, sans-serif',
  },
  dragmode: 'pan',
}

function channelDataReset() {
  frameBuffer = []
  channelData = [channelCount]
  for (let i = 0; i < channelCount; i++) {
    channelData[i] = {
      y: [0],
      mode: 'lines',
      line: { width: 1.5 },
      hoverlabel: {
        font: {
          family:
            '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen-Sans, Ubuntu, Cantarell, Helvetica Neue, sans-serif',
        },
      },
    }
  }
}

function array2frame(array, length) {
  var frame = []
  var indices = []

  for (let i = 0; i < channelCount && i < length; i++) {
    frame.push([array[i]])
    indices.push(i)
  }

  return { frame, indices }
}

function frameAppend(frame, indices) {
  Plotly.extendTraces(
    chartEl,
    {
      y: frame,
    },
    indices
  )

  frameCount++
  if (frameCount > frameShiftThreshold) {
    Plotly.relayout(chartEl, {
      xaxis: {
        range: [frameCount - frameShiftThreshold, frameCount],
      },
    })
  }
}

function relayoutChart() {
  Plotly.purge(chartEl)

  // update plot
  Plotly.react(chartEl, channelData, plotLayout, plotConfig)
}

function resetChart() {
  // reset state
  Plotly.purge(chartEl)
  frameCount = 0
  plotLayout.xaxis.range = [0, 100]
  channelDataReset()

  // create new plot
  Plotly.react(chartEl, channelData, plotLayout, plotConfig)
}
// var interval;
// document.getElementById('chart-switch').onclick = (e) => {
//   if (e.target.checked === true) {
//     chartEnable = true
//     resetChart()
//     // Plotly.newPlot(chartEl, channelData, chartLayout, chartConfig)
//   } else {
//     chartEnable = false
//   }
// }

// document.getElementById('chart-clean').onclick = () => resetChart()

function arrayAppend(array, length) {
  let { frame, indices } = array2frame(array, length)
  frameAppend(frame, indices)
}

function chartFrameProcess(buffer) {
  if (false === chartControl.enable) return

  frameBuffer += buffer

  let index = -1
  while ((index = frameBuffer.indexOf('\n')) !== -1) {
    let frame = frameBuffer.slice(0, index + 1)
    let frameArray = frame.toString().trim().split(' ')
    if ('NGF' === frameArray[0]) {
      frameArray = frameArray.slice(1, frameArray.length)
      if (frameArray.length !== channelCount) {
        channelCount = frameArray.length
        channelDataReset()

        Plotly.newPlot(chartEl, channelData, plotLayout, plotConfig)
      }
      arrayAppend(frameArray, frameArray.length)
    }

    frameBuffer = frameBuffer.slice(index + 1, frameBuffer.length)
  }
}

module.exports = {
  chartControl,
  chartFrameProcess,
}
