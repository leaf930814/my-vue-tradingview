<template>
  <div class="ChartContainer" id="tv_chart_container"></div>
</template>

<script>
import TVjsApi from "./api/index";
let jsApi = null; //图表配置项
export default {
  data() {
    return {
      transpair: "APPLE-CNY" //这里写死了
    };
  },
  mounted() {
    jsApi = new TVjsApi(this.transpair);
    jsApi.init(); //图表初始化
  },
  destroyed() {
    jsApi.destoryinstance().then(bool => {
      if (bool) {
        jsApi = null;
      }
    });
  }
};
</script>


<style>
.ChartContainer {
  width: 100%;
  height: 100%;
  flex: 1;
}
</style>
