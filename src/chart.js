const echarts = require("echarts");

var myChart = echarts.init(document.getElementById("chart-tab"));

var option = {
  title: {
    text: "ECharts entry example",
  },
  tooltip: {},
  legend: {
    data: ["Sales"],
  },
  xAxis: {
    data: ["shirt", "cardign", "chiffon shirt", "pants", "heels", "socks"],
  },
  yAxis: {},
  series: [
    {
      name: "Sales",
      type: "bar",
      data: [5, 20, 36, 10, 10, 20],
    },
  ],
};

// use configuration item and data specified to show chart
myChart.setOption(option);
