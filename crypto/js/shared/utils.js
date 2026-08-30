/**
 * Shared formatting and utility functions for crypto price apps.
 * Used by both Nobitex and Wallex pages.
 */
(function(global) {
  'use strict';

  function fmt(n, opts) {
    if (n == null || n === '') return '-';
    const x = parseFloat(n);
    if (!Number.isFinite(x)) return '-';
    return x.toLocaleString('en-US', opts || { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  }

  function fmtRls(n) {
    return fmt(n, { maximumFractionDigits: 0 });
  }

  function fmtPrice(n) {
    return fmt(n);
  }

  function fmtPercent(n) {
    const x = parseFloat(n) || 0;
    return (x >= 0 ? '+' : '') + x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  function fmtUsdtSetup(n) {
    return parseFloat(n).toLocaleString('en-US', { maximumFractionDigits: 4 });
  }

  /** Parse K/M/B multiplier prefix from symbol (e.g. 1M_PEPE -> {symbol:'pepe', factor:1e6}) */
  function parseBaseMultiplier(base) {
    if (!base || typeof base !== 'string') return null;
    const m = base.match(/^(\d+(?:\.\d+)?)\s*([kmb])_(.+)$/i);
    if (!m) return null;
    const num = parseFloat(m[1]);
    const letter = (m[2] || '').toUpperCase();
    const symbol = (m[3] || '').toLowerCase();
    const mult = letter === 'K' ? 1e3 : letter === 'M' ? 1e6 : letter === 'B' ? 1e9 : null;
    if (!mult || !Number.isFinite(num)) return null;
    return { symbol, factor: num * mult };
  }

  function hasPriceData(s) {
    if (!s || typeof s !== 'object') return false;
    const n = function(v) { const x = parseFloat(v); return Number.isFinite(x) && x > 0; };
    return n(s.bestBuy) || n(s.bestSell) || n(s.latest);
  }

  /** Cumulative average until target value is reached (for orderbook setup calc) */
  function cumulUntilTarget(levels, targetRls) {
    const target = parseFloat(targetRls);
    if (!Array.isArray(levels) || !Number.isFinite(target) || target <= 0) return null;
    let v = 0, a = 0;
    for (let i = 0; i < levels.length; i++) {
      const p = parseFloat(levels[i][0]), am = parseFloat(levels[i][1]);
      if (!Number.isFinite(p) || !Number.isFinite(am) || p <= 0 || am <= 0) continue;
      const remainingValue = target - v;
      const usedAmount = Math.min(am, remainingValue / p);
      v += p * usedAmount;
      a += usedAmount;
      if (v >= target - Number.EPSILON * target) return v / a;
    }
    return null;
  }

  function computeSetup(asks, bids, targetRls) {
    return {
      buySetup: cumulUntilTarget(asks || [], targetRls),
      sellSetup: cumulUntilTarget(bids || [], targetRls)
    };
  }

  /** USDT Buy Setup diff: (Binance / USDT Buy Setup - 1) * 100 */
  function diffUsdtBuySetup(usdtBuyVal, tvPrice) {
    if (usdtBuyVal == null || tvPrice == null || usdtBuyVal === 0) return null;
    const u = parseFloat(usdtBuyVal), t = parseFloat(tvPrice);
    return (Number.isFinite(u) && Number.isFinite(t) && u !== 0) ? ((t / u) - 1) * 100 : null;
  }

  /** USDT Sell Setup diff: (USDT Sell Setup / Binance - 1) * 100 */
  function diffUsdtSellSetup(usdtSellVal, tvPrice) {
    if (usdtSellVal == null || tvPrice == null || tvPrice === 0) return null;
    const u = parseFloat(usdtSellVal), t = parseFloat(tvPrice);
    return (Number.isFinite(u) && Number.isFinite(t) && t !== 0) ? ((u / t) - 1) * 100 : null;
  }

  function fmtSetupDiff(diff) {
    if (diff == null || !Number.isFinite(diff)) return '';
    const sign = diff >= 0 ? '+' : '';
    const cls = diff >= 0 ? 'positive' : 'negative';
    return '<br><span class="price-diff ' + cls + '">' + sign + diff.toFixed(2) + '%</span>';
  }

  global.SharedUtils = {
    fmt,
    fmtRls,
    fmtPrice,
    fmtPercent,
    fmtUsdtSetup,
    fmtSetupDiff,
    parseBaseMultiplier,
    hasPriceData,
    cumulUntilTarget,
    computeSetup,
    diffUsdtBuySetup,
    diffUsdtSellSetup
  };
})(typeof window !== 'undefined' ? window : this);
