//获取交易对信息
export const initSymbolInfo = (symbol, pricescale) => {
  return {
    'base_name': [symbol],
    'data_status': "streaming",
    'description': `${symbol},Tonghuashun`,
    'exchange': "Tonghuashun",
    'full_name': symbol,
    'has_intraday': true,
    'intraday_multipliers': ["1", "5", "15", "30", "60", "240"],
    'legs': symbol,
    'minmov': 1,
    'name': `Tonghuashun${symbol}`,
    // 'pricescale': 100000,
    'pricescale': Math.pow(10, pricescale) || 10000,
    'pro_name': symbol,
    'session': "24x7",
    'supported_resolutions': ["1", "5", "15", "30", "60", "240", "1D", "1W", "1M"],
    'ticker': `Tonghuashun:${symbol}`,
    'timezone': "Asia/Shanghai",
    'type': "crypto",
    'volume_precision': pricescale,
    // TODO: 新增属性
    'has_weekly_and_monthly': true
  };
}
/**
 * @description 修改默认商品信息
 */
export const defaultSymbol = symbol => {
  return {
    'base_name': [symbol],
    'data_status': "streaming",
    'description': `${symbol},Tonghuashun`,
    'exchange': "Tonghuashun",
    'full_name': symbol,
    'has_intraday': true,
    'intraday_multipliers': ["1", "5", "15", "30", "60", "240"],
    'legs': symbol,
    'minmov': 1,
    'name': `Tonghuashun${symbol}`,
    // 'pricescale': 100000,
    'pricescale': 10000,
    'pro_name': symbol,
    'session': "24x7",
    'supported_resolutions': ["1", "5", "15", "30", "60", "240", "1D", "1W", "1M"],
    'ticker': `Tonghuashun:${symbol}`,
    'timezone': "Asia/Shanghai",
    'type': "crypto",
    'volume_precision': 5,
    // 新增属性
    'has_weekly_and_monthly': true
  };
}

/**
 * @description 修改默认配置
 */
export const defaultConfiguration = () => {
  return {
    supports_search: false,
    supports_group_request: false,
    supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '5D', '1W', '1M'],
    supports_marks: true,
    supports_timescale_marks: true,
    supports_time: true
  };
}
