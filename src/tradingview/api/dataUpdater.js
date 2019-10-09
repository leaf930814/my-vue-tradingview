class dataUpdater {
  constructor(datafeeds) {
    this.subscribers = {};
    this.requestsPending = 0;
    this.historyProvider = datafeeds;
  }
  /**
   * @description 订阅K线数据
   * @param {Object} symbolInfo
   * @param {String} resolution
   * @param {Function} newDataCallback function
   * @param {String} listenerGuid
   */
  subscribeBars(symbolInfo, resolution, newDataCallback, listenerGuid) {
    this.subscribers[listenerGuid] = {
      lastBarTime: null,
      listener: newDataCallback,
      resolution: resolution,
      symbolInfo: symbolInfo
    };
  }
  /**
   * @description 取消订阅K线数据
   * @param {String} listenerGuid
   */
  unsubscribeBars(listenerGuid) {
    delete this.subscribers[listenerGuid];
  }
  /**
   * @description 更新图表
   * @num 更新个数
   */
  updateData() {
    if (this.requestsPending) return;
    this.requestsPending = 0;
    for (let listenerGuid in this.subscribers) {
      this.requestsPending++;
      this.updateDataForSubscriber(listenerGuid).then(() => {
        return this.requestsPending--;
      }).catch(() => {
        return this.requestsPending--;
      });
    }
  }
  /**
   * @description 更新订阅data数据
   * @param {String} listenerGuid 
   */
  updateDataForSubscriber(listenerGuid) {
    return new Promise((resolve, reject) => {
      const subscriptionRecord = this.subscribers[listenerGuid];
      const rangeEndTime = parseInt((Date.now() / 1000).toString());
      const rangeStartTime = rangeEndTime - this.periodLengthSeconds(subscriptionRecord.resolution, 10);
      this.historyProvider.getBars(subscriptionRecord.symbolInfo, subscriptionRecord.resolution, rangeStartTime, rangeEndTime, (bars) => {
        this.onSubscriberDataReceived(listenerGuid, bars);
        resolve();
      }, () => {
        reject();
      });
    });
  }
  /**
   * @description 换算时间差
   * @param {String} resolution 周期
   * @param {Number} requiredPeriodsCount 个数
   */
  periodLengthSeconds(resolution, requiredPeriodsCount) {
    let daysCount = 0;
    if (resolution === 'D' || resolution === '1D') {
      daysCount = requiredPeriodsCount;
    } else if (resolution === 'M' || resolution === '1M') {
      daysCount = 31 * requiredPeriodsCount;
    } else if (resolution === 'W' || resolution === '1W') {
      daysCount = 7 * requiredPeriodsCount;
    } else {
      daysCount = requiredPeriodsCount * parseInt(resolution) / (24 * 60);
    }
    return daysCount * 24 * 60 * 60;
  }
  /**
   *
   * @param {*} listenerGuid
   * @param {*} bars
   */
  onSubscriberDataReceived(listenerGuid, bars) {
    if (!this.subscribers.hasOwnProperty(listenerGuid)) return
    if (!bars.length) return
    const lastBar = bars[bars.length - 1];
    const subscriptionRecord = this.subscribers[listenerGuid];
    if (subscriptionRecord.lastBarTime !== null && lastBar.time < subscriptionRecord.lastBarTime) return;
    const isNewBar = subscriptionRecord.lastBarTime !== null && lastBar.time > subscriptionRecord.lastBarTime
    if (isNewBar) {
      if (bars.length < 2) {
        throw new Error('Not enough bars in history for proper pulse update. Need at least 2.');
      }
      console.log('新的数据更新中。。。。');
      subscriptionRecord.listener(lastBar)
    }
    subscriptionRecord.lastBarTime = lastBar.time
    subscriptionRecord.listener(lastBar);

  }
}

export default dataUpdater;
