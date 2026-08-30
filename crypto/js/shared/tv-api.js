/**
 * Third-party price API (Binance) for comparison with exchange prices.
 * Shared by Nobitex and Wallex pages.
 */
(function(global) {
  'use strict';

  const TV_SOURCES = {
    binance: {
      label: 'Binance',
      spotUrl: 'https://api.binance.com/api/v3/ticker/price',
      futuresUrl: 'https://fapi.binance.com/fapi/v1/ticker/price',
      parse: function(data) {
        if (!Array.isArray(data)) return {};
        const next = {};
        data.forEach(function(it) {
          if (typeof it.symbol === 'string' && it.symbol.endsWith('USDT') && it.price != null) {
            next[it.symbol.slice(0, -4).toLowerCase()] = String(it.price);
          }
        });
        return next;
      }
    }
  };

  function fetchTV(sourceKey, onSuccess) {
    const src = TV_SOURCES[sourceKey || 'binance'] || TV_SOURCES.binance;
    if (src.spotUrl && src.futuresUrl) {
      Promise.all([
        fetch(src.spotUrl).then(function(r) { return r.json(); }),
        fetch(src.futuresUrl).then(function(r) { return r.json(); })
      ]).then(function(results) {
        const spotData = results[0], futuresData = results[1];
        const next = src.parse(spotData);
        const futures = src.parse(futuresData);
        if (futures.xmr != null) next.xmr = futures.xmr;
        if (Object.keys(next).length > 0 && typeof onSuccess === 'function') onSuccess(next);
      }).catch(function() {});
    } else {
      const url = src.url || src.spotUrl;
      if (!url) return;
      fetch(url).then(function(r) { return r.json(); }).then(function(data) {
        const next = src.parse(data);
        if (Object.keys(next).length > 0 && typeof onSuccess === 'function') onSuccess(next);
      }).catch(function() {});
    }
  }

  function getTVTitle(sourceKey) {
    const src = TV_SOURCES[sourceKey || 'binance'] || TV_SOURCES.binance;
    return src.label || sourceKey || 'Binance';
  }

  global.TVApi = {
    fetch: fetchTV,
    getTitle: getTVTitle,
    SOURCES: TV_SOURCES
  };
})(typeof window !== 'undefined' ? window : this);
