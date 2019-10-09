const Websocket = require("ws");
const host = process.env.host || '127.0.0.1';
const port = process.env.port || '3000';
const wss = new Websocket.Server({
  host,
  port
});

//交易对假设：APPLE/CNY
function createklinedata(resolutioninfo, timestamp, from, to) {
  let obj = Object.create(null);
  obj = {
    date: from * 1000,
    dateEnd: to * 1000,
    symbol: 'APPLE/CNY',
    period: resolutioninfo,
    open: parseFloat((Math.random() * (10 - 5) + 5).toFixed(4)),
    close: parseFloat((Math.random() * (10 - 5) + 5).toFixed(4)),
    high: parseFloat((Math.random() * (10 - 5) + 5).toFixed(4)),
    low: parseFloat((Math.random() * (10 - 5) + 5).toFixed(4)),
    volume: parseFloat((Math.random() * (1000 - 10) + 10).toFixed(4)),
    time: timestamp * 1000,
    isEnd: false,
    amount: parseFloat((Math.random() * (16000 - 8000) + 8000).toFixed(4))
  }
  return obj;
}

wss.on('connection', (ws, req) => {
  const ip = req.connection.remoteAddress; // 客户端IP地址
  console.log(`${ip} Joined successfully`);

  ws.on('message', function incoming(message) {
    let requestparams = JSON.parse(message);

    if (requestparams.pong) { // 心跳检测
      ws.send(JSON.stringify({
        type: 'ping',
        value: Date.now()
      }));
    } else { // 其他消息推送
      switch (requestparams.type) {
        case "sub": // 订阅K线
          {
            let requestvalue = requestparams.value;
            setInterval(() => {
              let now = Math.floor(Date.now() / 1000);
              let newdata = createklinedata(requestvalue.resolutioninfo, now, now, now);
              let responsedata = {
                type: "subscribeBars",  // 新增type类型
                topic: requestvalue,
                timestamp: Date.now(),
                data: newdata
              }
              if (ws.readyState == 1) {
                ws.send(JSON.stringify(responsedata));
              }
            }, 2000);
          }
          break;
        default:
          break;
      }
    }
  });
});
