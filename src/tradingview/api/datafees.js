import dataUpdater from './dataUpdater';
import { initSymbolInfo, defaultSymbol, defaultConfiguration } from './initData';

class datafeeds {
  constructor(self) {
    this.self = self;
    this.currentsymbolinfo = null;
    this.barsUpdater = new dataUpdater(this);
  }
  /**
   * @description 提供填充配置数据的对象
   * @param {*Function} callback  回调函数
   */
  onReady(callback) {
    return new Promise((resolve) => {
      let configuration = this.defaultConfiguration();
      if (this.self.getConfig) {
        configuration = Object.assign(this.defaultConfiguration(), this.self.getConfig);
      }
      resolve(configuration)
    }).then((data) => {
      return callback(data);
    });
  }
  /**
   * @description 通过商品名称解析商品信息
   * @param {String} symbolName 商品名
   * @param {Function} onSymbolResolvedCallback 成功回调
   * @param {Function} onResolveErrorCallback 失败回调
   */
  resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
    return new Promise((resolve, reject) => {
      let symbolinfo = initSymbolInfo(this.self.symbol, this.self.pricescale);
      if (symbolinfo) {
        resolve(symbolinfo);
      } else {
        reject(new Error('error.system.default'));
      }
    }).then((data) => {
      onSymbolResolvedCallback(data);
    }).catch((err) => {
      onResolveErrorCallback(err);
    });
  }
  /**
   * @description 通过日期范围获取历史K线数据。图表库希望通过onHistoryCallback仅一次调用，接收所有的请求历史。而不是被多次调用。
   * @param {*Object} symbolInfo  商品信息对象
   * @param {*String} resolution  分辨率
   * @param {*Number} from  最左边请求的K线时间戳
   * @param {*Number} to  最右边请求的K线时间戳
   * @param {*Function} onHistoryCallback  回调函数
   */
  getBars(symbolInfo, resolution, from, to, onHistoryCallback) {
    const onLoadedCallback = data => {
      data && data.length ? onHistoryCallback(data, { noData: false }) : onHistoryCallback([], { noData: true })
    }
    this.self.getBars(symbolInfo, resolution, from, to, onLoadedCallback);
  }
  /**
   * @description 订阅K线数据, 图表库将调用onRealtimeCallback方法以更新实时数据
   * @param {*} symbolInfo  商品信息对象
   * @param {*} resolution  周期 "1D"
   * @param {*} onRealtimeCallback
   * @param {*} subscriberUID
   * @param {*} onResetCacheNeededCallback
   */
  subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
    console.log('订阅K线数据............');
    this.barsUpdater.subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback);
  }
  /**
   * @description 取消订阅K线数据
   * @param {String} subscriberUID
   */
  unsubscribeBars(subscriberUID) {
    this.barsUpdater.unsubscribeBars(subscriberUID);
    let deleteresultion = null;
    if (subscriberUID.lastIndexOf('_') > -1) {
      deleteresultion = subscriberUID.slice(subscriberUID.lastIndexOf('_') + 1);
      this.self.unSubscribe(deleteresultion);
      return;
    }
    if (subscriberUID.lastIndexOf('-') > -1) {
      deleteresultion = subscriberUID.slice(subscriberUID.lastIndexOf('-') + 1);
      this.self.unSubscribe(deleteresultion);
      return;
    }
  }
  /**
   * @description 修改默认配置
   */
  defaultConfiguration() {
    defaultConfiguration();
  }
  /**
   * @description 修改默认商品信息
   */
  defaultSymbol(symbol) {
    defaultSymbol(symbol);
  }
}
export default datafeeds;
