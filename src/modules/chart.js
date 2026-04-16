const Plotly = require('plotly.js-basic-dist-min')
const chartEl = document.getElementById('chart-figure')
const store = require('./store.js').init()

// Get theme colors based on dark theme setting
function getThemeColors() {
  const isDark = store.get('general.darkTheme')
  return {
    background: isDark ? '#2d2f3e' : '#ffffff',
    paperBg: isDark ? '#2d2f3e' : '#ffffff',
    fontColor: isDark ? '#cccccc' : '#000000',
    gridColor: isDark ? '#3e3e42' : '#bdbdbd',
    zeroLineColor: isDark ? '#5e5e62' : '#757575',
    lineColors: isDark
      ? ['#4ec9b0', '#569cd6', '#ce9178', '#dcdcaa']
      : ['#26a69a', '#2196f3', '#f44336', '#ff9800'],
  }
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
let chartEnable = false
let frameCount = 0
let frameBuffer = []
let relayoutScheduled = false // Debounce flag for relayout operations
let pendingFrameData = null // Batch multiple frames into single update

let channelCount = 2
let channelData = [{}]
const plotConfig = {
  responsive: true,
  displayModeBar: true, // Hide toolbar to reduce rendering overhead
  scrollZoom: true,
  displaylogo: false,
  doubleClick: false, // Disable double-click interaction
  showTips: false, // Disable tips for better performance
  staticPlot: false,
  animate: false, // Disable animations for real-time data
}

// Initialize layout with theme colors
const colors = getThemeColors()
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
  const colors = getThemeColors()

  for (let i = 0; i < channelCount; i++) {
    channelData[i] = {
      y: [0],
      mode: 'lines',
      line: {
        width: 1.5,
        color: colors.lineColors[i % colors.lineColors.length],
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
  let frame = []
  let indices = []

  for (let i = 0; i < channelCount && i < length; i++) {
    frame.push([array[i]]) // Create array wrapper for each channel
    indices.push(i)
  }

  return { frame, indices }
}

function frameAppend(frame, indices) {
  // Batch frame data instead of immediate Plotly update
  if (!pendingFrameData) {
    pendingFrameData = {
      y: frame.map((channelData) => [...channelData]),
      indices: indices,
    }
  } else {
    // Accumulate frames for batch update
    pendingFrameData.y.forEach((channel, idx) => {
      channel.push(...frame[idx])
    })
  }

  frameCount++

  // Schedule batched update with debouncing
  if (!relayoutScheduled) {
    relayoutScheduled = true
    requestAnimationFrame(() => {
      // Apply all accumulated frames at once
      if (pendingFrameData) {
        Plotly.extendTraces(chartEl, { y: pendingFrameData.y }, pendingFrameData.indices)
        pendingFrameData = null
      }

      // Update x-axis range only when needed
      if (frameCount > frameShiftThreshold) {
        const xAxisRange = [frameCount - frameShiftThreshold, frameCount]
        Plotly.relayout(chartEl, {
          'xaxis.range': xAxisRange,
        })
      }

      relayoutScheduled = false
    })
  }
}

function relayoutChart() {
  Plotly.purge(chartEl)

  // Update colors based on current theme
  const colors = getThemeColors()
  plotLayout.paper_bgcolor = colors.paperBg
  plotLayout.plot_bgcolor = colors.background
  plotLayout.font.color = colors.fontColor
  plotLayout.xaxis.gridcolor = colors.gridColor
  plotLayout.xaxis.zerolinecolor = colors.zeroLineColor
  plotLayout.yaxis = plotLayout.yaxis || {}
  plotLayout.yaxis.gridcolor = colors.gridColor
  plotLayout.yaxis.zerolinecolor = colors.zeroLineColor

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
  const colors = getThemeColors()
  plotLayout.paper_bgcolor = colors.paperBg
  plotLayout.plot_bgcolor = colors.background
  plotLayout.font.color = colors.fontColor
  plotLayout.xaxis.gridcolor = colors.gridColor
  plotLayout.xaxis.zerolinecolor = colors.zeroLineColor
  plotLayout.yaxis = plotLayout.yaxis || {}
  plotLayout.yaxis.gridcolor = colors.gridColor
  plotLayout.yaxis.zerolinecolor = colors.zeroLineColor

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
  let hasNewFrame = false

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
      hasNewFrame = true
    }

    frameBuffer = frameBuffer.slice(index + 1, frameBuffer.length)
  }

  // Throttle processing - yield to main thread if processing too many frames
  if (hasNewFrame && frameBuffer.length > 0) {
    setTimeout(() => chartFrameProcess(Buffer.from([])), 0)
  }
}

module.exports = {
  chartFrameProcess,
  relayoutChart, // Export for theme update
}
