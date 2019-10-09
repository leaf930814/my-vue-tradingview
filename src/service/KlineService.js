//这里只是模拟数据
import kineData from '../data/klineData';
/**
 * @description 通过交易对名称周期获取k线数据
 */
export const getKlineData = () => new Promise(resolve => {
  resolve(kineData)
})
