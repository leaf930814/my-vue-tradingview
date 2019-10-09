import socket from "./socket";
import datafeeds from './datafees';
import { getOverrides, getStudiesOverrides } from '@/utils/overrides';
import { getKlineData } from '@/service/KlineService.js';
import { throttle } from '@/utils'
class TVjsApi {
  constructor(symbol) {
    this.symbol = symbol;
    this.pricescale = 5; //每个交易对的精度
    this.urls = 'ws://localhost:3000';
    this.widgets = null; //tradingview图表
    this.socket = new socket(this.urls);
    this.interval = localStorage.getItem('tradingview.resolution') || '1D'; //图表周期
    this.cacheData = {}; //图表缓存数据
    this.resolveSymbolinfo = {}; //交易对信息
    this.lastTime = null;
    this.getBarTimer = null;
    this.studies = []; //配置项
    this.isLoading = true; //是否懒加载
    this.socket.doOpen();
    this.socket.on('message', this.onMessage.bind(this));
    this.socket.on('close', this.onClose.bind(this));
    this.datafeeds = new datafeeds(this);
    this.initMessage = throttle(this.initMessage, 3000);
  }
  /**
   * @description 图表初始化
   */
  init() {
    let resolution = this.interval; //图表周期
    let symbol = this.symbol; //交易对信息
    let locale = 'zh'; //中文本地化
    let skin = localStorage.getItem('tradingViewTheme') || 'black'; //皮肤
    if (!this.widgets) {
      this.widgets = new window.TradingView.widget({
        autosize: true,
        symbol: symbol,
        interval: resolution,
        container_id: 'tv_chart_container',
        datafeed: this.datafeeds,
        library_path: '../static/charting_library/',
        timezone: 'Asia/Shanghai',
        custom_css_url: 'chart.css',
        toolbar_bg: '#1b2331', //工具栏的背景颜色
        locale: locale,
        debug: false,
        disabled_features: [ //禁用插件
          "header_symbol_search",
          "header_saveload",
          "header_screenshot",
          "header_chart_type",
          "header_compare",
          "header_undo_redo",
          "timeframes_toolbar",
          "volume_force_overlay",
          "header_resolutions",
          "header_interval_dialog_button",
          "show_interval_dialog_on_key_press",
          "header_indicators"
        ],
        enabled_features: [ //启用插件
          "study_templates"
        ],
        overrides: getOverrides(skin),
        studies_overrides: getStudiesOverrides(skin),
        customFormatters: {
          timeFormatter: {
            format: function (date) {
              let _format_str = '%h:%m:%s';
              let utchours = date.getUTCHours();
              if (utchours < 10) {
                utchours = '0' + utchours;
              }
              let utcminutes = date.getUTCMinutes();
              if (utcminutes < 10) {
                utcminutes = '0' + utcminutes;
              }
              let utcseconds = date.getUTCSeconds();
              if (utcseconds < 10) {
                utcseconds = '0' + utcseconds;
              }
              return _format_str.replace('%h', utchours, 2).replace('%m', utcminutes, 2).replace('%s', utcseconds, 2);
            }
          },
          dateFormatter: {
            format: function (date) {
              let utcmonth = date.getUTCMonth() + 1;
              if (utcmonth < 10) {
                utcmonth = '0' + utcmonth;
              }
              let utcdate = date.getUTCDate();
              if (utcdate < 10) {
                utcdate = '0' + utcdate;
              }
              return date.getUTCFullYear() + '-' + utcmonth + '-' + utcdate;
            }
          }
        }
      });
      let thats = this.widgets;
      const buttons = [
        { title: '1min', resolution: '1', chartType: 1 },
        { title: '5min', resolution: '5', chartType: 1 },
        { title: '15min', resolution: '15', chartType: 1 },
        { title: '30min', resolution: '30', chartType: 1 },
        { title: '1hour', resolution: '60', chartType: 1 },
        { title: '4hour', resolution: '240', chartType: 1 },
        { title: '1day', resolution: '1D', chartType: 1 },
        { title: '1week', resolution: '1W', chartType: 1 },
        { title: '1month', resolution: '1M', chartType: 1 },
      ];
      thats.headerReady().then(() => {
        this.createButton(buttons); //生成时间按钮
      });
      thats.onChartReady(() => {
        this.createStudy(); //设置均线种类 均线样式
      });
    }
  }
  /**
   * @description 创建5、10、20、30日均线
   */
  createStudy() {
    let thats = this.widgets;
    let id = thats.chart().createStudy('Moving Average', false, false, [5], null, { 'Plot.color': 'rgb(150, 95, 196)' });
    this.studies.push(id);
    id = thats.chart().createStudy('Moving Average', false, false, [10], null, { 'Plot.color': 'rgb(116,149,187)' });
    this.studies.push(id);
    id = thats.chart().createStudy('Moving Average', false, false, [20], null, { "plot.color": "rgb(58,113,74)" });
    this.studies.push(id);
    id = thats.chart().createStudy('Moving Average', false, false, [30], null, { "plot.color": "rgb(118,32,99)" });
    this.studies.push(id);
  }
  /**
   * @description 生成周期按钮
   */
  createButton(buttons) {
    let widget = this.widgets;
    let allresolution = [];
    let self = this;
    for (let index = 0; index < buttons.length; index++) {
      let button = widget.createButton();
      button.textContent = buttons[index].title;
      button.setAttribute('data-resolution', buttons[index].resolution);
      let directlyparent = button.parentNode.parentNode;
      directlyparent.className += ' Kline-resolutionparent';
      directlyparent.setAttribute('data-resolution', buttons[index].resolution);
      if (buttons[index].resolution == this.interval) {
        directlyparent.className += ' cur';
      }
      allresolution.push(directlyparent);
      button.addEventListener('click', function () {
        let state = true;
        Object.keys(self.cacheData).forEach((item) => {
          if (item.indexOf('state') > -1) {
            if (!self.cacheData[item]) {
              state = !state;
            }
          }
        });
        if (!state) {
          let selectedresolution = this.getAttribute('data-resolution');
          if (self.interval == selectedresolution) {
            return;
          }
          self.isLoading = true;
          self.interval = selectedresolution;
          localStorage.setItem('tradingview.resolution', selectedresolution);
          for (let i = 0; i < allresolution.length; i++) {
            let element = allresolution[i];
            let eleresolution = element.getAttribute('data-resolution');
            if (eleresolution == self.interval) {
              element.className += ' cur';
            } else {
              if (element.className.includes('cur')) {
                let classarr = element.className.split(' ');
                classarr.pop();
                element.className = classarr.join(" ");
              }
            }
          }
          widget.chart().setResolution(self.interval, function () {
            self.isLoading = false;
          });
        }
      });
    }
    //创建指标
    let indicatorbutton = widget.createButton();
    indicatorbutton.textContent = '指标';
    indicatorbutton.className += ' indicator';
    indicatorbutton.addEventListener('click', function () {
      widget.chart().executeActionById("insertIndicator");
    });
  }
  /**
   * @description websocket推送信息
   * @param {Object} e
   */
  onMessage(e) {
    switch (e.type) {
      case 'getBars': //获取历史K线数据
        {
          this.disabled = true;
          let data = e.data;
          const ticker = `Tonghuashun${this.symbol}-${this.interval}`; //TonghuashunAPPLE/CNY-15
          const tickerCallback = ticker + "Callback"; //TonghuashunAPPLE/CNY-15Callback
          if (data && data.length) {

            // 过滤后端数据为null的字段
            data = data.filter(e => e.indexOf(null) < 0)

            let list = [];
            const tickerstate = ticker + "state"; //TonghuashunAPPLE/CNY-15state
            const onLoadedCallback = this.cacheData[tickerCallback];
            list = this.getCacheDataTicker(data);
            //如果没有缓存数据，则直接填充，发起订阅
            if (!this.cacheData[ticker]) {
              this.cacheData[ticker] = list;
              this.subscribe(); //发起订阅
            }
            //新数据即当前时间段需要的数据，直接喂给图表插件
            if (onLoadedCallback) {
              onLoadedCallback(list, { noData: false });
              delete this.cacheData[tickerCallback];
            }
            //请求完成，设置状态为false
            this.cacheData[tickerstate] = !1;
            //记录当前缓存时间，即数组最后一位的时间
            this.lastTime = this.cacheData[ticker][this.cacheData[ticker].length - 1].time;
          } else {
            const onLoadedCallback = this.cacheData[tickerCallback];
            const tickerstate = ticker + "state"; //TonghuashunAPPLE/CNY-15state
            //请求完成，设置状态为false
            this.cacheData[tickerstate] = !1;
            if (onLoadedCallback) {
              onLoadedCallback([], { noData: true });
              delete this.cacheData[tickerCallback];
            }
          }
        }
        break;
      case "subscribeBars": //订阅后数据
        {
          let data = e.data;
          if (data) {
            const ticker = `Tonghuashun${this.symbol}-${this.interval}`; //TonghuashunAPPLE/CNY-1d
            let barsData = {
              time: data.time,
              open: data.open,
              high: data.high,
              low: data.low,
              close: data.close,
              volume: data.volume,
              isBarClosed: true,
              isLastBar: false
            }
            const cannotwritable = ["1D", "1W", "1M"];
            if (cannotwritable.includes(this.interval)) {
              let addtime = 86400000;
              if (this.interval == '1D') {
                barsData.time += addtime;
              }
              if (this.interval == '1W') {
                barsData.time += (addtime * 7);
              }
              if (this.interval == '1M') {
                barsData.time = this.getNextMonth(barsData.time);
              }
            }
            //如果增量更新数据的时间大于缓存时间，而且缓存有数据
            if (barsData.time > this.lastTime && this.cacheData[ticker] && this.cacheData[ticker].length) {
              //增量更新的数据直接加入缓存数组
              this.cacheData[ticker].push(barsData);
              //修改缓存时间
              this.lastTime = barsData.time;
              //通知图表插件，可以开始增量更新的渲染了
              this.datafeeds.barsUpdater.updateData();
            } else if (barsData.time == this.lastTime && this.cacheData[ticker] && this.cacheData[ticker].length) {
              //如果增量更新的时间等于缓存时间，即在当前时间颗粒内产生了新数据，更新当前数据
              this.cacheData[ticker][this.cacheData[ticker].length - 1] = barsData;
              //通知图表插件，可以开始增量更新的渲染了
              this.datafeeds.barsUpdater.updateData();
            }
          }
        }
        break;
      default:
        break;
    }
  }
  getCacheDataTicker(list) {
    const cannotwritable = ["1D", "1W", "1M"];
    let addtime = 86400000;
    return list.map((item) => {
      let newItem = {
        time: item[0],
        timeEnd: item[1],
        period: item[2],
        open: item[3],
        close: item[4],
        high: item[5],
        low: item[6],
        amount: item[7],
        volume: item[8],
        isBarClosed: true,
        isLastBar: false
      };
      if (cannotwritable.includes(this.interval)) {
        if (this.interval == '1D') {
          newItem.time += addtime;
        }
        if (this.interval == '1W') {
          newItem.time += (addtime * 7);
        }
        if (this.interval == '1M') {
          newItem.time = this.getNextMonth(newItem.time);
        }
      }
      return newItem;
    });
  }
  /**
   * @description 当前日期下一月
   */
  getNextMonth(date) {
    let timestr = new Date(date);
    let year = timestr.getUTCFullYear();
    let month = timestr.getUTCMonth();
    let day = timestr.getUTCDate();
    // eslint-disable-next-line no-unused-vars
    let days = new Date(year, month, 0);
    days = days.getDate(); //获取当前日期中的月的天数
    let year2 = year;
    let month2 = parseInt(month) + 1;
    if (month2 == 13) {
      year2 = parseInt(year2) + 1;
      month2 = 1;
    }
    let day2 = day;
    let days2 = new Date(year2, month2, 0);
    days2 = days2.getDate();
    if (day2 > days2) {
      day2 = days2;
    }
    if (month2 < 10) {
      month2 = '0' + month2;
    }
    // let t2 = year2 + '-' + month2 + '-' + day2;
    let nextmonth = new Date(year2, month2, day2, 0, 0, 0).getTime();
    return nextmonth;
  }
  /**
   * @description websocket关闭信息
   */
  onClose() {
    console.log('tradingview index.js >> : 连接已断开... 正在重连')
    this.socket.doOpen();
    this.socket.on('open', () => {
      console.log(' >> : 已重连')
      this.subscribe();
    });
  }
  /**
   * 发送websocket消息
   * @param {Object} data
   */
  sendMessage(data) {
    if (this.socket.checkOpen()) { //检验websocket是否打开
      this.socket.send(data);
    } else {
      this.socket.on('open', () => {
        this.socket.send(data);
      });
    }
  }
  /**
   * @description 获取历史K线数据
   * @param {*} symbolInfo
   * @param {*} resolution
   * @param {*} rangeStartDate
   * @param {*} rangeEndDate
   * @param {*} onLoadedCallback
   */
  getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback) {
    let ticker = `${symbolInfo.name}-${resolution}`;
    let tickerload = ticker + "load";
    let tickerstate = ticker + "state";
    if (!this.cacheData[ticker] && !this.cacheData[tickerstate]) { //如果缓存没有数据，而且未发出请求，记录当前节点开始时间
      this.cacheData[tickerload] = rangeStartDate;
      //发起请求，从websocket获取当前时间段的数据
      this.initMessage(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback);
      //设置状态为true
      this.cacheData[tickerstate] = true;
      return false;
    }
    // 获取历史记录
    if (!this.cacheData[tickerload] || this.cacheData[tickerload] > rangeStartDate) { //如果缓存有数据，但是没有当前时间段的数据，更新当前节点时间
      this.cacheData[tickerload] = rangeStartDate;
      this.initMessage(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback);
      //设置状态为true
      this.cacheData[tickerstate] = true;
      return false;
    }
    console.log(`开始订阅时状态：${this.cacheData[tickerstate]}`);
    if (this.cacheData[tickerstate]) { //正在从websocket获取数据，禁止一切操作
      return false;
    }
    ticker = `${symbolInfo.name}-${this.interval}`;
    // 如果缓存中有当前时间段的数据，构造newBars，调用onLoadedCallback(newBars)。
    if (this.cacheData[ticker] && this.cacheData[ticker].length) {
      this.isLoading = false; //关闭loading
      const newBars = [];
      this.cacheData[ticker].forEach(item => {
        // if (item.time >= rangeStartDate * 1000 && item.time <= rangeEndDate * 1000) {
        if (item.time >= rangeStartDate * 1000) {
          newBars.push(item);
        }
      });
      onLoadedCallback(newBars);
    } else {
      this.getBarTimer = setTimeout(() => {
        this.getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback)
      }, 5000);
    }
  }
  /**
   * @description 初始化数据
   * @param {*} symbolInfo
   * @param {*} resolution
   * @param {*} rangeStartDate
   * @param {*} rangeEndDate
   * @param {*} onLoadedCallback
   */
  initMessage(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback) {
    //保留当前回调
    const tickerCallback = symbolInfo.name + "-" + resolution + "Callback";
    this.cacheData[tickerCallback] = onLoadedCallback;

    //如果当前时间节点已经改变，停止上一个时间节点的订阅，修改时间节点值
    if (this.interval !== resolution) {
      this.unSubscribe(this.interval)
      this.interval = resolution;
    }
    //获取当前时间段的数据，在onMessage中执行回调onLoadedCallback
    if (symbolInfo && resolution && rangeStartDate && rangeEndDate) {
      let symbol = symbolInfo.full_name;
      let resolutionstr = this.initresolutionstr(resolution);
      let params = {
        symbol,
        interval: resolutionstr,
        startTime: rangeStartDate * 1000,
        endTime: rangeEndDate * 1000,
      }
      //获取接口数据，然后再从sokect中获取数据
      getKlineData(params).then((res) => {
        console.log(res)
        if (res.data && res.data.length) {
          this.onMessage({
            type: 'getBars',
            data: res.data,
            endTime: rangeEndDate * 1000,
          });
        } else {
          this.onMessage({
            type: 'getBars',
            data: []
          });
        }
      }).catch((err) => {
        console.log(err);
      });
    }
  }
  initresolutionstr(resolution) {
    let resolutionstr = '';
    if (resolution <= 60) {
      resolutionstr = resolution + 'm';
    } else if (resolution == 240) {
      resolutionstr = '4h';
    } else if (resolution == '1D') {
      resolutionstr = '1d';
    } else if (resolution == '1W') {
      resolutionstr = '1w';
    } else if (resolution == '1M') {
      resolutionstr = '1mon';
    }
    return resolutionstr;
  }
  /**
   * @description 发起订阅
   */
  subscribe() {
    let resolutionstr = this.initresolutionstr(this.interval);
    let params = {
      type: "sub",
      value: `market.${this.symbol}.kline.${resolutionstr}`
    }
    this.sendMessage(JSON.stringify(params));
  }
  /**
   * @description 取消订阅
   * @param {String} interval 周期
   */
  unSubscribe(interval) {
    // 停止订阅，删除过期缓存、缓存时间、缓存状态
    const ticker = `Tonghuashun${this.symbol}-${interval}`;
    const tickertime = ticker + "load";
    const tickerstate = ticker + "state";
    const tickerCallback = ticker + "Callback";
    delete this.cacheData[ticker];
    delete this.cacheData[tickertime];
    delete this.cacheData[tickerstate];
    delete this.cacheData[tickerCallback];
    // let resolutionstr = this.initresolutionstr(this.interval);
    let resolutionstr = this.initresolutionstr(interval);
    let params = {
      type: "unsub",
      value: `market.${this.symbol}.kline.${resolutionstr}`
    }
    this.sendMessage(JSON.stringify(params));
  }
  /**
   * @description 切换交易对
   * @param {String} newpair 新交易对
   * @param {String} oldpair 旧交易对
   */
  switchtranspair(newpair, oldpair) {
    // 旧交易对 停止订阅，删除过期缓存、缓存时间、缓存状态
    const oldticker = `Tonghuashun${oldpair}-${this.interval}`;
    this.datafeeds.unsubscribeBars(oldticker); //取消订阅
    const tickertime = oldticker + "load";
    const tickerstate = oldticker + "state";
    const tickerCallback = oldticker + "Callback";
    delete this.cacheData[oldticker];
    delete this.cacheData[tickertime];
    delete this.cacheData[tickerstate];
    delete this.cacheData[tickerCallback];

    this.symbol = newpair;
    this.isLoading = true;
    return new Promise((resolve) => {
      resolve({ //reslove回递消息确认
        symbol: this.symbol
      });
    });
  }
  /**
   * @description 销毁操作
   */
  destoryinstance() {
    this.unSubscribe(this.interval);
    return new Promise((resolve) => {
      this.widgets = null;
      this.cacheData = {};
      this.resolveSymbolinfo = {}; //交易对信息
      this.lastTime = null;
      this.getBarTimer = null;
      this.studies = []; //配置项
      this.socket.destroy();
      resolve(true);
    });
  }
}

export default TVjsApi;
