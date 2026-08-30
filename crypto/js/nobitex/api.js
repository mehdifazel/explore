/**
 * Nobitex API client. Direct fetch only (no CORS proxy).
 */
(function(global) {
  'use strict';
  var C = global.NobitexConfig || {};

  function fetchApi(path, opts) {
    var url = (C.API_BASE || 'https://apiv2.nobitex.ir') + path;
    return fetch(url, Object.assign({ cache: 'no-store' }, opts || {})).then(function(response) {
      if (!response.ok) throw new Error('Nobitex API HTTP ' + response.status);
      return response;
    });
  }

  function fetchWithdraw(onSuccess, retries) {
    retries = retries || 0;
    fetchApi('/v2/options')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.status !== 'ok' || !Array.isArray(d.coins)) { if (retries > 0) setTimeout(function() { fetchWithdraw(onSuccess, retries - 1); }, 2000); return; }
        var next = {};
        d.coins.forEach(function(c) {
          var k = (c.coin || '').toLowerCase();
          if (!k) return;
          var list = c.networkList || {};
          var nets = Object.keys(list).map(function(key) { return list[key]; })
            .filter(function(n) { return n && n.withdrawEnable; })
            .map(function(n) { return n.name || n.network || ''; })
            .filter(Boolean);
          if (nets.length) next[k] = nets;
        });
        if (typeof onSuccess === 'function') onSuccess(next);
      })
      .catch(function() { if (retries > 0) setTimeout(function() { fetchWithdraw(onSuccess, retries - 1); }, 2000); });
  }

  global.NobitexApi = { fetch: fetchApi, fetchWithdraw: fetchWithdraw };
})(typeof window !== 'undefined' ? window : this);
