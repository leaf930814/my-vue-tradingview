/* eslint-disable */
class socket {
  constructor(url, options = null) {
    this.url = url;
    this.heartCheck = {
      timeout: 3000, //3s
      timeoutObj: null,
      ws: null,
      reset: function () {
        clearTimeout(this.timeoutObj);
        this.start();
      },
      start: function (ws = null) {
        if (!this.ws) {
          this.ws = ws;
        }
        if (this.ws.readyState == 1) {
          this.timeoutObj = setTimeout(() => {
            if (this.ws) {
              this.ws.send(JSON.stringify({ type: "ping", "value": Date.now() }));
            }
          }, this.timeout);
        }
      }
    };
    this.options = options;
    this.messageMap = {};
    this.connState = 0; //连接状态
    this.socket = null;
  }
  doOpen() { // 开启websocket连接
    if (this.connState) {
      return
    }
    this.connState = 1;
    const BrowserWebSocket = window.WebSocket || window.MozWebSocket;
    const socket = new BrowserWebSocket(this.url);
    const _this = this;
    socket.onopen = (e) => {
      _this.heartCheck.start(socket);
      return _this.onOpen(e);
    }
    socket.onmessage = (e) => {
      _this.heartCheck.reset();
      return _this.onMessage(JSON.parse(e.data));
    }
    socket.onclose = (e) => {
      return _this.onClose(e);
    }
    socket.onerror = (e) => {
      return _this.onError(e);
    }
    this.socket = socket;
  }
  onOpen(e) { // 连接打开
    this.connState = 2;
    this.onReceiver({ Event: 'open' });
  }
  onMessage(e) { // 接收websocket推送信息
    try {
      let data = e;
      this.onReceiver({ Event: 'message', data });
    } catch (error) {
      console.error(' >> onMessage 发生错误', error);
    }
  }
  onClose(e) { // websocket关闭
    console.log('关闭websocket链接....');
    this.connState = 0;
    this.onReceiver({ Event: 'close' });
  }
  onError(e) { // websocket错误
    this.connState = 0;
    this.doClose();
    console.log(' >> onError 发生错误', e);
  }
  checkOpen() { // 检验websocket连接状态
    return this.connState == 2;
  }
  send(data) { // 发送信息
    if (this.socket.readyState != 1) {
      setTimeout(() => {
        this.send(data);
      }, 100);
    } else {
      this.socket.send(data);
    }
  }
  onReceiver(data) { // 注册接收器
    let callback = this.messageMap[data.Event];
    if (callback) callback(data.data);
  }
  on(eventname, handler) { //绑定监听事件
    this.messageMap[eventname] = handler;
  }
  emit(data) { // 绑定传递事件
    return new Promise((resolve, reject) => {
      this.socket.send(data);
      this.on('message', (data) => {
        resolve(data);
      });
    });
  }
  doClose() { // 主动关闭websocket
    this.socket.close();
  }
  destroy() { // 销毁websocket
    if (this.heartCheck.timeoutObj) {
      clearTimeout(this.heartCheck.timeoutObj);
    }
    this.doClose();
    this.messageMap = {};
    this.connState = 0;
    this.socket = null;
  }
}

export default socket;
