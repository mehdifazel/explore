/**
 * Wallex API client.
 * Endpoints: GET /v1/markets, GET /v1/depth?symbol=SYMBOL
 * All used endpoints are public; no API key is stored or sent.
 */
(function(global) {
  'use strict';

  var C = global.WallexConfig || {};
  var API_BASE = C.API_BASE || 'https://api.wallex.ir';
  function apiFetch(path, opts) {
    var url = API_BASE + path;
    return fetch(url, Object.assign({ cache: 'no-store' }, opts || {})).then(function(response) {
      if (!response.ok) throw new Error('Wallex API HTTP ' + response.status);
      return response;
    });
  }

  /** Fetch all markets with stats. Returns normalized stats object. */
  function fetchMarkets() {
    return apiFetch('/v1/markets').then(function(r) { return r.json(); }).then(function(d) {
      if (!d.success || !d.result || !d.result.symbols) throw new Error((d && d.message) || 'Invalid Wallex markets response');
      var symbols = d.result.symbols;
      var stats = {};
      for (var sym in symbols) {
        if (!symbols.hasOwnProperty(sym)) continue;
        var s = symbols[sym];
        var st = s.stats;
        if (!st) continue;
        var base = (s.baseAsset || sym.replace(/TMN|USDT|IRT$/i, '')).toLowerCase();
        var quote = (s.quoteAsset || (sym.indexOf('TMN') !== -1 ? 'TMN' : 'USDT')).toLowerCase();
        var pairKey = base + '-' + quote;
        stats[pairKey] = {
          bestBuy: st.bidPrice,
          bestSell: st.askPrice,
          latest: st.lastPrice || st.bidPrice,
          dayChange: st['24h_ch'] != null ? String(st['24h_ch']) : '',
          volumeDst: parseFloat(st['24h_quoteVolume']) || 0
        };
      }
      return stats;
    });
  }

  /** Fetch orderbook/depth for symbol. Converts to [price, amount] arrays. */
  function fetchDepth(symbol) {
    return apiFetch('/v1/depth?symbol=' + encodeURIComponent(symbol)).then(function(r) { return r.json(); }).then(function(d) {
      if (!d.success || !d.result) throw new Error((d && d.message) || 'Invalid Wallex depth response');
      var r = d.result;
      var toLevels = function(arr) {
        if (!Array.isArray(arr)) return [];
        return arr.map(function(x) {
          var p = (x && (x.price != null)) ? String(x.price) : '0';
          var q = (x && (x.quantity != null)) ? String(x.quantity) : '0';
          return [p, q];
        });
      };
      var asks = toLevels(r.ask || []);
      var bids = toLevels(r.bid || []);
      var lastPrice = (asks[0] && asks[0][0]) || (bids[0] && bids[0][0]);
      return {
        status: 'ok',
        asks: asks,
        bids: bids,
        lastTradePrice: lastPrice
      };
    });
  }

  function fetchNetworks(symbols) {
    var clean = (symbols || []).map(function(symbol) { return String(symbol || '').toUpperCase(); }).filter(Boolean);
    return fetch('/api/wallex-private/networks?symbols=' + encodeURIComponent(clean.join(',')), { cache: 'no-store' })
      .then(function(response) { return response.json().then(function(data) { return { response: response, data: data }; }); })
      .then(function(result) {
        if (!result.response.ok || !result.data.success) {
          var error = new Error(result.data.message || 'Wallex network data unavailable');
          error.code = result.data.code || '';
          throw error;
        }
        return result.data.result || {};
      });
  }

  /** Map an exchange-native pair (e.g. btc-tmn) to a Wallex symbol (e.g. BTCTMN). */
  function pairToWallexSymbol(pair) {
    var parts = (pair || '').split('-');
    var base = (parts[0] || '').toUpperCase();
    var quote = (parts[1] || '').toLowerCase();
    if (quote === 'tmn') return base + 'TMN';
    if (quote === 'usdt') return base + 'USDT';
    return base + (quote.toUpperCase());
  }

  global.WallexApi = {
    fetch: apiFetch,
    fetchMarkets: fetchMarkets,
    fetchDepth: fetchDepth,
    fetchNetworks: fetchNetworks,
    pairToSymbol: pairToWallexSymbol
  };
})(typeof window !== 'undefined' ? window : this);
