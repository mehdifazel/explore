/**
 * Wallex exchange configuration.
 * API docs: https://developers.wallex.ir/
 */
(function(global) {
  'use strict';

  global.WallexConfig = {
    API_BASE: 'https://api.wallex.ir',
    API_KEY: '18134|RGpxrj5gmD2Gn0seCnRHzBHj2mF4KBm14p7vjCgj',
    SETUP_DELAY_MS: 250,
    USDT_AVG_THROTTLE_MS: 12000,
    TV_INTERVAL_MS: 5000,
    SETUP_INTERVAL_MS: 5000,
    REST_POLL_MS: 5000,
    MT_DEFAULT: 1e9,
    TV_SOURCE: 'binance'
  };
})(typeof window !== 'undefined' ? window : this);
