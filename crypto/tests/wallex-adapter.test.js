'use strict';

const assert = require('node:assert/strict');

const calls = [];
global.fetch = async (url, options) => {
  calls.push({ url, options });
  const body = url.includes('/api/wallex-private/networks')
    ? { success: true, result: { BTC: [{ id: 'BTC', name: 'Bitcoin', withdrawalAvailable: true }] } }
    : url.includes('/v1/depth')
    ? { success: true, result: { ask: [{ price: 101, quantity: 2 }], bid: [{ price: 99, quantity: 3 }] } }
    : { success: true, result: { symbols: {
        BTCTMN: { symbol: 'BTCTMN', baseAsset: 'BTC', quoteAsset: 'TMN', isMarketTypeEnable: true, stats: { bidPrice: '99', askPrice: '101', lastPrice: '100', '24h_ch': 2.5, '24h_quoteVolume': '1234' } },
        ETHUSDT: { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', isMarketTypeEnable: true, stats: { bidPrice: '1999', askPrice: '2001', lastPrice: '2000', '24h_ch': -1, '24h_quoteVolume': '5678' } }
      } } };
  return { ok: true, status: 200, json: async () => body };
};

const { WallexApi } = require('../js/wallex/api.js');

(async () => {
  const stats = await WallexApi.fetchMarkets();
  assert.equal(stats['btc-tmn'].bestBuy, '99');
  assert.equal(stats['btc-tmn'].bestSell, '101');
  assert.equal(stats['eth-usdt'].latest, '2000');
  assert.equal(WallexApi.pairToSymbol('btc-tmn'), 'BTCTMN');
  assert.equal(WallexApi.pairToSymbol('eth-usdt'), 'ETHUSDT');

  const depth = await WallexApi.fetchDepth('BTCTMN');
  assert.deepEqual(depth.asks, [['101', '2']]);
  assert.deepEqual(depth.bids, [['99', '3']]);
  const networks = await WallexApi.fetchNetworks(['BTC']);
  assert.equal(networks.BTC[0].withdrawalAvailable, true);
  assert.ok(calls.every(call => !call.options.headers || !call.options.headers['x-api-key']));
  console.log('wallex adapter tests passed');
})().catch(error => { console.error(error); process.exit(1); });
