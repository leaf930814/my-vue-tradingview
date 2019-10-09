<template>
  <div id="app">
    <!-- K线图表 -->
    <div class="chart-container-wrap">
      <ChartContainer></ChartContainer>
    </div>
  </div>
</template>

<script>
import ChartContainer from "@/tradingview/ChartContainer.vue";
export default {
  name: "app",
  components: {
    ChartContainer
  }
};
</script>

<style>
* {
  margin: 0;
}
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
.chart-container-wrap {
  height: 500px;
}
</style>
