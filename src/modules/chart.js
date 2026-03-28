const Plotly = require('plotly.js-basic-dist-min')
const chartEl = document.getElementById('chart-figure')
const store = require('./store.js').init()

// Get theme colors based on dark theme setting
function getThemeColors() {
  const isDark = store.get('general.darkTheme');
  return {
    background: isDark ? '#282a36' : '#ffffff',
    paperBg: isDark ? '#282a36' : '#ffffff',
    fontColor: isDark ? '#cccccc' : '#000000',
    gridColor: isDark ? '#3e3e42' : '#bdbdbd',
    zeroLineColor: isDark ? '#5e5e62' : '#757575',
    lineColors: isDark ? ['#4ec9b0', '#569cd6', '#ce9178', '#dcdcaa'] : ['#26a69a', '#2196f3', '#f44336', '#ff9800']
  };
}

chartEl.addEventListener('menuResized', () => {
  console.log('Menu resized, relayout chart')
  relayoutChart()
})
chartEl.addEventListener('chartTabActivated', () => {
  console.log('Chart tab activated, relayout chart')
  relayoutChart()
})
chartEl.addEventListener('serialDataCleanup', () => {
  console.log('Serial data cleaned up, reset chart')
  resetChart()
})

const frameShiftThreshold = 100
var chartEnable = false
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

// Initialize layout with theme colors
const colors = getThemeColors();
const plotLayout = {
  // showlegend: false,
  paper_bgcolor: colors.paperBg,
  plot_bgcolor: colors.background,
  font: {
    family:
      '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen-Sans, Ubuntu, Cantarell, Helvetica Neue, sans-serif',
    color: colors.fontColor,
  },
  margin: {
    l: 50,
    r: 50,
    b: 50,
    t: 20,
    pad: 0,
  },
  xaxis: {
    range: [0, 100],
    gridcolor: colors.gridColor,
    zerolinecolor: colors.zeroLineColor,
  },
  yaxis: {
    gridcolor: colors.gridColor,
    zerolinecolor: colors.zeroLineColor,
  },
  dragmode: 'pan',
}

function channelDataReset() {
  frameBuffer = []
  channelData = [channelCount]
  const colors = getThemeColors();

  for (let i = 0; i < channelCount; i++) {
    channelData[i] = {
      y: [0],
      mode: 'lines',
      line: {
        width: 1.5,
        color: colors.lineColors[i % colors.lineColors.length]
      },
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

  // Update colors based on current theme
  const colors = getThemeColors();
  plotLayout.paper_bgcolor = colors.paperBg;
  plotLayout.plot_bgcolor = colors.background;
  plotLayout.font.color = colors.fontColor;
  plotLayout.xaxis.gridcolor = colors.gridColor;
  plotLayout.xaxis.zerolinecolor = colors.zeroLineColor;
  plotLayout.yaxis = plotLayout.yaxis || {};
  plotLayout.yaxis.gridcolor = colors.gridColor;
  plotLayout.yaxis.zerolinecolor = colors.zeroLineColor;

  // update plot
  Plotly.react(chartEl, channelData, plotLayout, plotConfig)
}

function resetChart() {
  // reset state
  Plotly.purge(chartEl)
  frameCount = 0
  plotLayout.xaxis.range = [0, 100]
  channelDataReset()

  // Update colors based on current theme
  const colors = getThemeColors();
  plotLayout.paper_bgcolor = colors.paperBg;
  plotLayout.plot_bgcolor = colors.background;
  plotLayout.font.color = colors.fontColor;
  plotLayout.xaxis.gridcolor = colors.gridColor;
  plotLayout.xaxis.zerolinecolor = colors.zeroLineColor;
  plotLayout.yaxis = plotLayout.yaxis || {};
  plotLayout.yaxis.gridcolor = colors.gridColor;
  plotLayout.yaxis.zerolinecolor = colors.zeroLineColor;

  // create new plot
  Plotly.react(chartEl, channelData, plotLayout, plotConfig)
}
document.getElementById('chart-switch').onclick = (e) => {
  if (e.target.checked === true) {
    chartEnable = true
    relayoutChart()
  } else {
    chartEnable = false
  }
}

function arrayAppend(array, length) {
  let { frame, indices } = array2frame(array, length)
  frameAppend(frame, indices)
}

function chartFrameProcess(buffer) {
  if (false === chartEnable) return

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

        Plotly.react(chartEl, channelData, plotLayout, plotConfig)
      }
      arrayAppend(frameArray, frameArray.length)
    }

    frameBuffer = frameBuffer.slice(index + 1, frameBuffer.length)
  }
}

module.exports = {
  chartFrameProcess,
  relayoutChart, // Export for theme update
}
