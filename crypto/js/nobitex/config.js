/**
 * Nobitex exchange configuration.
 * API: https://apiv2.nobitex.ir
 */
(function(global) {
  'use strict';
  global.NobitexConfig = {
    API_BASE: 'https://apiv2.nobitex.ir',
    SETUP_DELAY_MS: 250,
    USDT_AVG_THROTTLE_MS: 12000,
    TV_INTERVAL_MS: 5000,
    SETUP_INTERVAL_MS: 5000,
    REST_POLL_MS: 5000,
    MT_DEFAULT: 1e9,
    TV_SOURCE: 'binance'
  };
})(typeof window !== 'undefined' ? window : this);
