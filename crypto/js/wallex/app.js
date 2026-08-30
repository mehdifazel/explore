/**
 * Wallex Live Prices - Main application.
 * Mirrors Nobitex functionality using Wallex API.
 */
(function() {
  'use strict';

  var C = window.WallexConfig || {};
  var Api = window.WallexApi || {};
  var U = window.SharedUtils || {};
  var TV = window.TVApi || {};
  var Ndb = window.NetworkDb || {};

  var fmt = U.fmt || function(n) { return n; };
  var fmtRls = U.fmtRls || fmt;
  var fmtPrice = U.fmtPrice || fmt;
  var fmtPercent = U.fmtPercent || function(n) { return n + '%'; };
  var fmtUsdtSetup = U.fmtUsdtSetup || fmt;
  var fmtSetupDiff = U.fmtSetupDiff || function() { return ''; };
  var parseBaseMultiplier = U.parseBaseMultiplier || function() { return null; };
  var hasPriceData = U.hasPriceData || function() { return false; };
  var computeSetup = U.computeSetup || function() { return {}; };
  var diffUsdtBuySetup = U.diffUsdtBuySetup || function() { return null; };
  var diffUsdtSellSetup = U.diffUsdtSellSetup || function() { return null; };

  var state = {
    filter: 'rls',
    sortCol: null,
    sortDir: 1,
    networkFilter: '',
    stats: {},
    prevStats: {},
    tvPrices: {},
    networkDb: {},
    currentOrderbookBase: null,
    globalAvgBuyMT: null,
    globalAvgSellMT: null,
    lastUsdtAvgTime: 0,
    restPoll: null,
    restRetry: null,
    setupInterval: null,
    tvInterval: null
  };

  var $ = {};

  function getPairTagsHtml(base) {
    return Ndb.renderPairTagsHtml ? Ndb.renderPairTagsHtml(base, state.networkDb, parseBaseMultiplier) : '';
  }

  function getNetworksShort(base) {
    var nets = Ndb.getNetworks ? Ndb.getNetworks(base, state.networkDb, parseBaseMultiplier) : [];
    return nets.map(function(n) { return Ndb.shortName ? Ndb.shortName(n) : n; }).join(' ');
  }

  function initDom() {
    var ids = ['loading', 'error', 'priceTable', 'tbody', 'priceTableHeadRow', 'orderbookPanel', 'orderbookTitle', 'updateIntervalSec', 'networkFilter',
      'orderbookLoading', 'orderbookBody', 'orderbookPriceLine', 'orderbookAsksBody', 'orderbookBidsBody', 'orderbookClose',
      'orderbookTooltip', 'usdtBuy', 'usdtSell', 'usdtAvgMTInput', 'usdtAvgBuyMTLabel', 'usdtAvgSellMTLabel',
      'usdtAvgBuy100MT', 'usdtAvgSell100MT', 'lastUpdate', 'marketCount', 'connectionWarning', 'setupRefreshBtn'];
    ids.forEach(function(id) { $[id] = document.getElementById(id); });
  }

  function getTVTitle() {
    return TV.getTitle ? TV.getTitle(C.TV_SOURCE) : 'Binance';
  }

  function getTVBases() {
    if (!state.stats || typeof state.stats !== 'object') return [];
    var bases = [];
    Object.keys(state.stats).forEach(function(k) {
      if (!hasPriceData(state.stats[k])) return;
      if (k.indexOf('-rls') !== -1) bases.push(k.replace(/-rls$/, '').toLowerCase());
      if (k.indexOf('-usdt') !== -1) bases.push(k.replace(/-usdt$/, '').toLowerCase());
    });
    return bases;
  }

  function getTVPriceForBase(base) {
    var parsed = parseBaseMultiplier(base);
    if (parsed) {
      var p = state.tvPrices[parsed.symbol];
      if (p == null) return null;
      return parseFloat(p) * parsed.factor;
    }
    var p = state.tvPrices[base];
    return p != null ? parseFloat(p) : null;
  }

  function renderUsdtBuySetupCell(val, base) {
    var txt = val != null ? fmtUsdtSetup(val) : '-';
    var tv = getTVPriceForBase(base);
    return txt + fmtSetupDiff(diffUsdtBuySetup(val, tv));
  }

  function renderUsdtSellSetupCell(val, base) {
    var txt = val != null ? fmtUsdtSetup(val) : '-';
    var tv = getTVPriceForBase(base);
    return txt + fmtSetupDiff(diffUsdtSellSetup(val, tv));
  }

  function mtToToman(mt) {
    var n = parseFloat(mt);
    return (Number.isFinite(n) && n > 0) ? n * 1e6 : C.MT_DEFAULT;
  }

  function getMT() {
    var v = $.usdtAvgMTInput ? parseFloat($.usdtAvgMTInput.value) : NaN;
    return (Number.isFinite(v) && v > 0) ? v : 100;
  }

  function getTargetUsdt() {
    var mt = getMT();
    var ur = state.stats['usdt-rls'];
    if (!ur || !ur.bestSell || ur.bestSell <= 0) return null;
    return mtToToman(mt) / parseFloat(ur.bestSell);
  }

  function updateCell(el, val, prev) {
    if (!el) return;
    var n = parseFloat(val), p = parseFloat(prev);
    el.textContent = fmtPrice(val);
    el.classList.remove('flash-up', 'flash-down');
    if (prev !== undefined && p !== n) {
      el.classList.add(n > p ? 'flash-up' : 'flash-down');
      setTimeout(function() { el.classList.remove('flash-up', 'flash-down'); }, 600);
    }
  }

  function setEl(el, v) {
    if (el) el.textContent = v != null ? fmtRls(v) : (v === null ? 'N/A' : '-');
  }

  function updateUsdtAvg(onDone) {
    var mt = getMT();
    if ($.usdtAvgBuyMTLabel) $.usdtAvgBuyMTLabel.textContent = mt;
    if ($.usdtAvgSellMTLabel) $.usdtAvgSellMTLabel.textContent = mt;
    if (Date.now() - state.lastUsdtAvgTime < (C.USDT_AVG_THROTTLE_MS || 12000)) {
      if (typeof onDone === 'function') onDone();
      return;
    }
    state.lastUsdtAvgTime = Date.now();
    Api.fetchDepth('USDTTMN').then(function(d) {
      if (d.status !== 'ok' || !d.asks || !d.bids) {
        setEl($.usdtAvgBuy100MT, '-');
        setEl($.usdtAvgSell100MT, '-');
      } else {
        var target = mtToToman(mt);
        state.globalAvgBuyMT = U.cumulUntilTarget ? U.cumulUntilTarget(d.asks, target) : null;
        state.globalAvgSellMT = U.cumulUntilTarget ? U.cumulUntilTarget(d.bids, target) : null;
        setEl($.usdtAvgBuy100MT, state.globalAvgBuyMT);
        setEl($.usdtAvgSell100MT, state.globalAvgSellMT);
      }
      if (typeof onDone === 'function') onDone();
    }).catch(function() { if (typeof onDone === 'function') onDone(); });
  }

  function bindOrderbookTooltip(pair) {
    var tt = $.orderbookTooltip;
    if (!tt) return;
    var parts = (pair || 'btc-rls').split('-');
    var dst = parts[1] || 'rls';
    var quoteUnit = dst === 'rls' ? 'TMN' : 'USDT';
    var rows = Array.prototype.slice.call(document.querySelectorAll('#orderbookAsksBody tr, #orderbookBidsBody tr') || []);
    rows.forEach(function(r) {
      if (r._ttEnter) r.removeEventListener('mouseenter', r._ttEnter);
      if (r._ttLeave) r.removeEventListener('mouseleave', r._ttLeave);
    });
    function showTt(e) {
      var tr = e.target.closest('tr');
      var cumTotal = parseFloat(tr && tr.dataset.cumTotal);
      var cumAmount = parseFloat(tr && tr.dataset.cumAmount);
      var avgPrice = parseFloat(tr && tr.dataset.avgPrice);
      if (!Number.isFinite(cumTotal) || !Number.isFinite(cumAmount)) return;
      var fmtAvg = Number.isFinite(avgPrice) ? avgPrice.toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) : '-';
      var fmtAmt = cumAmount.toLocaleString('en-US', { maximumFractionDigits: 6 });
      var fmtTot = cumTotal.toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
      tt.innerHTML = '<dl><dt>Average Price</dt><dd>' + fmtAvg + ' ' + quoteUnit + '</dd><dt>Order Quantity</dt><dd>' + fmtAmt + '</dd><dt>Total Order</dt><dd>' + fmtTot + ' ' + quoteUnit + '</dd></dl>';
      tt.style.display = 'block';
      tt.style.left = (e.clientX + 12) + 'px';
      tt.style.top = (e.clientY + 12) + 'px';
    }
    function hideTt() { tt.style.display = 'none'; }
    function moveTt(e) { tt.style.left = (e.clientX + 12) + 'px'; tt.style.top = (e.clientY + 12) + 'px'; }
    rows.forEach(function(r) {
      r._ttEnter = function(e) { showTt(e); r.addEventListener('mousemove', moveTt); };
      r._ttLeave = function() { hideTt(); r.removeEventListener('mousemove', moveTt); };
      r.addEventListener('mouseenter', r._ttEnter);
      r.addEventListener('mouseleave', r._ttLeave);
    });
  }

  function showOrderbook(pair) {
    var parts = pair.split('-');
    var src = parts[0] || '';
    var srcL = src.toUpperCase();
    var dst = parts[1] || 'rls';
    var dstL = dst === 'rls' ? 'TMN' : 'USDT';
    $.orderbookPanel.classList.add('show');
    $.orderbookTitle.textContent = srcL + ' / ' + dstL;
    $.orderbookLoading.style.display = 'block';
    $.orderbookBody.style.display = 'none';
    state.currentOrderbookBase = src.toLowerCase();
    var symbol = Api.pairToSymbol(pair);
    Api.fetchDepth(symbol).then(function(d) {
      $.orderbookLoading.style.display = 'none';
      if (d.status !== 'ok' || !d.asks || !d.bids) {
        var msg = (d && d.message) ? d.message : 'No data for this market or market is closed.';
        $.orderbookAsksBody.innerHTML = '<tr><td colspan="3">' + msg + '</td></tr>';
        $.orderbookBidsBody.innerHTML = '';
      } else if (!(d.asks && d.asks.length) && !(d.bids && d.bids.length)) {
        $.orderbookAsksBody.innerHTML = '<tr><td colspan="3">Order book is empty.</td></tr>';
        $.orderbookBidsBody.innerHTML = '';
      } else {
        var asks = (d.asks || []).slice().reverse().slice(0, 50);
        var bids = (d.bids || []).slice(0, 50);
        var last = d.lastTradePrice || (asks[0] && asks[0][0]) || (bids[0] && bids[0][0]);
        var bt = 0, ba = 0;
        var bTot = bids.map(function(x) { bt += parseFloat(x[0]) * parseFloat(x[1]); return bt; });
        var bAmt = bids.map(function(x) { ba += parseFloat(x[1]); return ba; });
        var at = 0, aa = 0, aTot = [], aAmt = [];
        for (var i = asks.length - 1; i >= 0; i--) {
          at += parseFloat(asks[i][0]) * parseFloat(asks[i][1]);
          aa += parseFloat(asks[i][1]);
          aTot[i] = at;
          aAmt[i] = aa;
        }
        function mkRow(cls, cum, amt, p, a) {
          var ap = amt ? cum / amt : 0;
          return '<tr class="' + cls + '" data-cum-total="' + cum + '" data-cum-amount="' + amt + '" data-avg-price="' + ap + '"><td>' + fmtPrice(p) + '</td><td>' + parseFloat(a).toLocaleString('en-US', { maximumFractionDigits: 6 }) + '</td><td>' + fmtPrice(parseFloat(p) * parseFloat(a)) + '</td></tr>';
        }
        $.orderbookAsksBody.innerHTML = asks.map(function(x, i) { return mkRow('ask-row', aTot[i], aAmt[i], x[0], x[1]); }).join('');
        $.orderbookBidsBody.innerHTML = bids.map(function(x, i) { return mkRow('bid-row', bTot[i], bAmt[i], x[0], x[1]); }).join('');
        $.orderbookPriceLine.textContent = fmtPrice(last);
        bindOrderbookTooltip(pair);
      }
      $.orderbookBody.style.display = 'flex';
    }).catch(function(err) {
      $.orderbookLoading.style.display = 'none';
      $.orderbookAsksBody.innerHTML = '<tr><td colspan="3">Connection error: ' + (err && err.message ? err.message : 'data failed to load') + '</td></tr>';
      $.orderbookBidsBody.innerHTML = '';
      $.orderbookBody.style.display = 'flex';
    });
  }

  function updateTVCells() {
    var rows = $.tbody ? $.tbody.querySelectorAll('tr[data-rls-pair], tr[data-pair]') : [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var base = (r.getAttribute('data-rls-pair') || r.getAttribute('data-pair') || '').replace(/-rls$|-usdt$/, '').toLowerCase();
      var c = r.querySelector('[data-field="tvPrice"]');
      if (c) { var tv = base ? getTVPriceForBase(base) : null; c.textContent = tv != null ? fmtUsdtSetup(tv) : '-'; }
      var usdtB = r.querySelector('[data-field="usdtBuy"]'), usdtS = r.querySelector('[data-field="usdtSell"]');
      if (base && usdtB) {
        var v = usdtB.dataset.usdtBuy ? parseFloat(usdtB.dataset.usdtBuy) : null;
        usdtB.innerHTML = renderUsdtBuySetupCell(v, base);
      }
      if (base && usdtS) {
        var v = usdtS.dataset.usdtSell ? parseFloat(usdtS.dataset.usdtSell) : null;
        usdtS.innerHTML = renderUsdtSellSetupCell(v, base);
      }
    }
  }

  function updateSetup() {
    if (state.filter !== 'rls' || !state.stats || typeof state.stats !== 'object') return;
    var tbody = $.tbody;
    var pairs = Object.keys(state.stats)
      .filter(function(k) { return k.indexOf('-rls') !== -1 && hasPriceData(state.stats[k]); })
      .map(function(k) { return [k, state.stats[k]]; })
      .sort(function(a, b) { return (b[1].volumeDst || 0) - (a[1].volumeDst || 0); });
    var target = mtToToman(getMT());
    var i = 0;
    function next() {
      if (i >= pairs.length) return;
      var rlsPair = pairs[i][0];
      i++;
      var row = tbody ? tbody.querySelector('tr[data-rls-pair="' + rlsPair + '"]') : null;
      if (!row) { setTimeout(next, 0); return; }
      var symbol = Api.pairToSymbol(rlsPair);
      Api.fetchDepth(symbol).then(function(d) {
        if (d.status !== 'ok' || !d.asks || !d.bids) return;
        var setup = computeSetup(d.asks, d.bids, target);
        var base = rlsPair.replace(/-rls$/, '').toLowerCase();
        var rlsB = row.querySelector('[data-field="rlsBuySetup"]'), rlsS = row.querySelector('[data-field="rlsSellSetup"]');
        var usdtB = row.querySelector('[data-field="usdtBuy"]'), usdtS = row.querySelector('[data-field="usdtSell"]');
        var usdtBuyVal = setup.buySetup != null && state.globalAvgSellMT > 0 ? setup.buySetup / state.globalAvgSellMT : null;
        var usdtSellVal = setup.sellSetup != null && state.globalAvgBuyMT > 0 ? setup.sellSetup / state.globalAvgBuyMT : null;
        if (rlsB) rlsB.textContent = setup.buySetup != null ? fmtRls(setup.buySetup) : '-';
        if (rlsS) rlsS.textContent = setup.sellSetup != null ? fmtRls(setup.sellSetup) : '-';
        var diffBuy = diffUsdtBuySetup(usdtBuyVal, getTVPriceForBase(base));
        var diffSell = diffUsdtSellSetup(usdtSellVal, getTVPriceForBase(base));
        if (row) { row.dataset.diffUsdtBuy = diffBuy != null ? String(diffBuy) : ''; row.dataset.diffUsdtSell = diffSell != null ? String(diffSell) : ''; }
        if (usdtB) { usdtB.dataset.usdtBuy = usdtBuyVal != null ? String(usdtBuyVal) : ''; usdtB.innerHTML = renderUsdtBuySetupCell(usdtBuyVal, base); }
        if (usdtS) { usdtS.dataset.usdtSell = usdtSellVal != null ? String(usdtSellVal) : ''; usdtS.innerHTML = renderUsdtSellSetupCell(usdtSellVal, base); }
      }).catch(function() {}).finally(function() {
        setTimeout(next, C.SETUP_DELAY_MS || 250);
      });
    }
    next();
  }

  function updateSetupUsdt() {
    if (state.filter !== 'usdt' || !state.stats || typeof state.stats !== 'object') return;
    var targetUsdt = getTargetUsdt();
    if (targetUsdt == null || targetUsdt <= 0) return;
    var tbody = $.tbody;
    var pairRows = tbody ? Array.prototype.slice.call(tbody.querySelectorAll('tr[data-pair]')) : [];
    var pairs = pairRows.map(function(r) { return r.getAttribute('data-pair'); }).filter(Boolean);
    var i = 0;
    function next() {
      if (i >= pairs.length) return;
      var pair = pairs[i];
      i++;
      var row = tbody ? tbody.querySelector('tr[data-pair="' + pair + '"]') : null;
      if (!row) { setTimeout(next, 0); return; }
      var symbol = Api.pairToSymbol(pair);
      Api.fetchDepth(symbol).then(function(d) {
        if (d.status !== 'ok' || !d.asks || !d.bids) return;
        var setup = computeSetup(d.asks, d.bids, targetUsdt);
        var base = pair.replace(/-usdt$/, '').toLowerCase();
        var usdtB = row.querySelector('[data-field="usdtBuy"]'), usdtS = row.querySelector('[data-field="usdtSell"]');
        var usdtBuyVal = setup.buySetup;
        var usdtSellVal = setup.sellSetup;
        var diffBuy = diffUsdtBuySetup(usdtBuyVal, getTVPriceForBase(base));
        var diffSell = diffUsdtSellSetup(usdtSellVal, getTVPriceForBase(base));
        if (row) { row.dataset.diffUsdtBuy = diffBuy != null ? String(diffBuy) : ''; row.dataset.diffUsdtSell = diffSell != null ? String(diffSell) : ''; }
        if (usdtB) { usdtB.dataset.usdtBuy = usdtBuyVal != null ? String(usdtBuyVal) : ''; usdtB.innerHTML = renderUsdtBuySetupCell(usdtBuyVal, base); }
        if (usdtS) { usdtS.dataset.usdtSell = usdtSellVal != null ? String(usdtSellVal) : ''; usdtS.innerHTML = renderUsdtSellSetupCell(usdtSellVal, base); }
      }).catch(function() {}).finally(function() {
        setTimeout(next, C.SETUP_DELAY_MS || 250);
      });
    }
    next();
  }

  function makeSortableTh(label, sortKey) {
    return '<th class="sortable" data-sort="' + sortKey + '" title="Click to sort">' + label + '</th>';
  }

  function RLS_HEAD() {
    return '<th>Market</th><th>TMN Buy</th><th>TMN Sell</th><th>TMN Last</th>' + makeSortableTh('TMN 24h', 'dayChange') + '<th>TMN Sell Setup</th><th>TMN Buy Setup</th>' + makeSortableTh('USDT Sell Setup', 'diffUsdtSell') + makeSortableTh('USDT Buy Setup', 'diffUsdtBuy') + '<th title="' + getTVTitle() + '">' + getTVTitle() + '</th>';
  }

  function USDT_HEAD() {
    return '<th>Market</th><th>USDT Buy</th><th>USDT Sell</th><th>USDT Last</th>' + makeSortableTh('USDT 24h', 'dayChange') + makeSortableTh('USDT Sell Setup', 'diffUsdtSell') + makeSortableTh('USDT Buy Setup', 'diffUsdtBuy') + '<th title="' + getTVTitle() + '">' + getTVTitle() + '</th>';
  }

  function sortTableRows(sortKey) {
    var tbody = $.tbody;
    if (!tbody) return;
    var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr[data-rls-pair], tr[data-pair]') || []);
    if (!rows.length) return;
    var dir = (state.sortCol === sortKey) ? -state.sortDir : 1;
    state.sortCol = sortKey;
    state.sortDir = dir;
    function getVal(r) {
      var v = r.dataset[sortKey];
      if (v === '' || v === undefined || v == null) return NaN;
      return parseFloat(v);
    }
    rows.sort(function(a, b) {
      var va = getVal(a), vb = getVal(b);
      if (Number.isFinite(va) && !Number.isFinite(vb)) return -1;
      if (!Number.isFinite(va) && Number.isFinite(vb)) return 1;
      if (!Number.isFinite(va) && !Number.isFinite(vb)) return 0;
      return dir * (va - vb);
    });
    rows.forEach(function(r) { tbody.appendChild(r); });
    var ths = document.querySelectorAll('th.sortable');
    for (var j = 0; j < ths.length; j++) {
      ths[j].classList.remove('sort-asc', 'sort-desc');
      if (ths[j].dataset.sort === sortKey) ths[j].classList.add(dir === 1 ? 'sort-asc' : 'sort-desc');
    }
  }

  function renderTable(stats) {
    var thead = $.priceTableHeadRow;
    var tbody = $.tbody;
    if (!thead || !tbody) return;

    var netFilter = state.networkFilter || '';
    var hasNetwork = Ndb.hasNetwork || function() { return true; };
    if (state.filter === 'rls') {
      thead.innerHTML = RLS_HEAD();
      var pairs = Object.keys(stats)
        .filter(function(k) { return k.indexOf('-rls') !== -1 && hasPriceData(stats[k]) && hasNetwork(k.replace(/-rls$/, '').toLowerCase(), netFilter, state.networkDb, parseBaseMultiplier); })
        .map(function(k) { return [k, stats[k]]; })
        .sort(function(a, b) { return (b[1].volumeDst || 0) - (a[1].volumeDst || 0); });

      var filterChanged = (tbody.dataset.netFilter || '') !== netFilter; tbody.dataset.netFilter = netFilter;
      if (!tbody.querySelector('tr[data-rls-pair]') || filterChanged) {
        tbody.innerHTML = pairs.map(function(item) {
          var rlsPair = item[0], s = item[1];
          var base = rlsPair.replace(/-rls$/, '').toLowerCase(), m = base.toUpperCase();
          var dc = (s.dayChange != null && s.dayChange !== '') ? String(s.dayChange) : '';
          var tags = getPairTagsHtml(base);
          var nets = getNetworksShort(base);
          return '<tr data-rls-pair="' + rlsPair + '" data-networks="' + nets + '" data-day-change="' + dc + '" onclick="event.stopPropagation(); window.WallexApp.showOrderbook(\'' + rlsPair + '\')"><td class="pair">' + m + tags + '</td><td class="price" data-field="rls-bestBuy"></td><td class="price" data-field="rls-bestSell"></td><td class="price" data-field="rls-latest"></td><td class="positive" data-field="rls-dayChange"></td><td class="price" data-field="rlsSellSetup"></td><td class="price" data-field="rlsBuySetup"></td><td class="price" data-field="usdtSell"></td><td class="price" data-field="usdtBuy"></td><td class="price" data-field="tvPrice"></td></tr>';
        }).join('');
      }

      pairs.forEach(function(item) {
        var rlsPair = item[0];
        var row = tbody.querySelector('tr[data-rls-pair="' + rlsPair + '"]');
        if (!row) return;
        var s = stats[rlsPair] || {}, prev = state.prevStats[rlsPair] || {};
        ['bestBuy', 'bestSell', 'latest', 'dayChange'].forEach(function(f) {
          var c = row.querySelector('[data-field="rls-' + f + '"]');
          if (!c) return;
          if (f === 'dayChange') {
            c.textContent = fmtPercent(s.dayChange);
            c.className = (parseFloat(s.dayChange || 0) >= 0) ? 'positive' : 'negative';
            row.dataset.dayChange = (s.dayChange != null && s.dayChange !== '') ? String(s.dayChange) : '';
          } else {
            updateCell(c, s[f], prev[f]);
          }
        });
        state.prevStats[rlsPair] = Object.assign({}, s);
      });
      if ($.marketCount) $.marketCount.textContent = pairs.length;
    } else {
      thead.innerHTML = USDT_HEAD();
      var usdtPairs = Object.keys(stats)
        .filter(function(k) { return k.indexOf('-usdt') !== -1 && hasPriceData(stats[k]) && hasNetwork(k.replace(/-usdt$/, '').toLowerCase(), netFilter, state.networkDb, parseBaseMultiplier); })
        .map(function(k) { return [k, stats[k]]; })
        .sort(function(a, b) { return (b[1].volumeDst || 0) - (a[1].volumeDst || 0); });

      var filterChanged = (tbody.dataset.netFilter || '') !== netFilter; tbody.dataset.netFilter = netFilter;
      if (!tbody.querySelector('tr[data-pair]') || tbody.querySelector('tr[data-rls-pair]') || filterChanged) {
        tbody.innerHTML = usdtPairs.map(function(item) {
          var pair = item[0], s = item[1];
          var base = pair.replace(/-usdt$/, '').toLowerCase(), m = base.toUpperCase();
          var tags = getPairTagsHtml(base);
          var nets = getNetworksShort(base);
          var dc = (s.dayChange != null && s.dayChange !== '') ? String(s.dayChange) : '';
          return '<tr data-pair="' + pair + '" data-networks="' + nets + '" data-day-change="' + dc + '" onclick="event.stopPropagation(); window.WallexApp.showOrderbook(\'' + pair + '\')"><td class="pair">' + m + tags + '</td><td class="price" data-field="bestBuy"></td><td class="price" data-field="bestSell"></td><td class="price" data-field="latest"></td><td class="positive" data-field="dayChange"></td><td class="price" data-field="usdtSell"></td><td class="price" data-field="usdtBuy"></td><td class="price" data-field="tvPrice"></td></tr>';
        }).join('');
      }
      usdtPairs.forEach(function(item) {
        var pair = item[0], s = item[1];
        var row = tbody.querySelector('tr[data-pair="' + pair + '"]');
        if (!row) return;
        var prev = state.prevStats[pair] || {};
        ['bestBuy', 'bestSell', 'latest', 'dayChange'].forEach(function(f) {
          var c = row.querySelector('[data-field="' + f + '"]');
          if (!c) return;
          if (f === 'dayChange') {
            c.textContent = fmtPercent(s.dayChange);
            c.className = (parseFloat(s.dayChange || 0) >= 0) ? 'positive' : 'negative';
            row.dataset.dayChange = (s.dayChange != null && s.dayChange !== '') ? String(s.dayChange) : '';
          } else {
            updateCell(c, s[f], prev[f]);
          }
        });
        state.prevStats[pair] = Object.assign({}, s);
      });
      if ($.marketCount) $.marketCount.textContent = usdtPairs.length;
    }
    if ($.lastUpdate) $.lastUpdate.textContent = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    updateTVCells();
    if (state.filter === 'usdt') updateSetupUsdt();
    var ur = stats['usdt-rls'];
    if (ur) {
      if ($.usdtBuy) $.usdtBuy.textContent = fmtPrice(ur.bestSell);
      if ($.usdtSell) $.usdtSell.textContent = fmtPrice(ur.bestBuy);
    }
    updateUsdtAvg();
  }

  function showError(msg) {
    if ($.error) { $.error.textContent = msg; $.error.style.display = 'block'; }
    if ($.loading) $.loading.style.display = 'none';
    if ($.priceTable) $.priceTable.style.display = 'table';
  }

  function pollStats() {
    Api.fetchMarkets().then(function(stats) {
      if (stats && Object.keys(stats).length) {
        state.stats = stats;
        renderTable(state.stats);
      }
    }).catch(function() {});
  }

  function initRest() {
    if (state.restRetry) { clearTimeout(state.restRetry); state.restRetry = null; }
    Api.fetchMarkets().then(function(stats) {
      if (stats && Object.keys(stats).length) {
        state.stats = stats;
        state.prevStats = {};
        if ($.loading) $.loading.style.display = 'none';
        if ($.priceTable) $.priceTable.style.display = 'table';
        if ($.error) $.error.style.display = 'none';
        if ($.connectionWarning) $.connectionWarning.style.display = 'none';
        if (state.restRetry) { clearTimeout(state.restRetry); state.restRetry = null; }
        renderTable(state.stats);
        if (!state.setupInterval) {
          state.setupInterval = setInterval(function() { if (state.filter === 'rls') updateSetup(); else if (state.filter === 'usdt') updateSetupUsdt(); }, C.SETUP_INTERVAL_MS || 5000);
          updateSetup();
          updateSetupUsdt();
        }
        if (!state.restPoll) state.restPoll = setInterval(pollStats, C.REST_POLL_MS || 5000);
      } else {
        showError('Invalid response from server');
      }
    }).catch(function(err) {
      if (state.restRetry) { clearTimeout(state.restRetry); state.restRetry = null; }
      if (Object.keys(state.stats).length) {
        if ($.connectionWarning) $.connectionWarning.style.display = 'block';
        if ($.error) $.error.style.display = 'none';
        if ($.priceTable) $.priceTable.style.display = 'table';
        if ($.loading) $.loading.style.display = 'none';
        state.restRetry = setTimeout(initRest, 3000);
      } else {
        showError('Connection error. If opened from file (file://), try serving via HTTP; otherwise check your internet connection.');
        state.restRetry = setTimeout(initRest, 5000);
      }
    });
  }

  window.WallexApp = { showOrderbook: showOrderbook };

  function fillNetworkFilter() {
    var sel = $.networkFilter;
    if (!sel) return;
    var opts = Ndb.getAllNetworkShortNames ? Ndb.getAllNetworkShortNames(state.networkDb) : [];
    sel.innerHTML = '<option value="">All networks</option>' + opts.map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join('');
  }

  document.addEventListener('DOMContentLoaded', function() {
    initDom();
    if ($.updateIntervalSec) $.updateIntervalSec.textContent = Math.round((C.REST_POLL_MS || 5000) / 1000);
    state.networkDb = Ndb.DB || {};
    function applyNetworkDb(d) { if (d && Object.keys(d).length) { state.networkDb = d; fillNetworkFilter(); if (Object.keys(state.stats).length) renderTable(state.stats); } }
    (Ndb.fetchFromApi && Ndb.fetchFromApi().then(applyNetworkDb).catch(function() {
      fetch('data/nobitex-withdraw-networks.json', { cache: 'no-store' }).then(function(r) { return r.json(); }).then(applyNetworkDb).catch(function() {});
    })) || fetch('data/nobitex-withdraw-networks.json', { cache: 'no-store' }).then(function(r) { return r.json(); }).then(applyNetworkDb).catch(function() {});
    if (Ndb.fetchFromApi && Ndb.REFRESH_INTERVAL_MS) setInterval(function() { Ndb.fetchFromApi().then(applyNetworkDb).catch(function() {}); }, Ndb.REFRESH_INTERVAL_MS);
    initRest();
    if (TV.fetch) TV.fetch(C.TV_SOURCE, function(prices) {
      state.tvPrices = prices;
      updateTVCells();
    });
    if (!state.tvInterval) state.tvInterval = setInterval(function() {
      if (TV.fetch) TV.fetch(C.TV_SOURCE, function(prices) {
        state.tvPrices = prices;
        updateTVCells();
      });
    }, C.TV_INTERVAL_MS || 5000);

    document.querySelectorAll('.tab[data-filter]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        state.filter = this.getAttribute('data-filter');
        if (Object.keys(state.stats).length) renderTable(state.stats);
      });
    });
    fillNetworkFilter();
    if ($.networkFilter) $.networkFilter.addEventListener('change', function() { state.networkFilter = (this.value || ''); if (Object.keys(state.stats).length) renderTable(state.stats); });
    if ($.priceTable) $.priceTable.addEventListener('click', function(e) {
      var th = e.target.closest('th.sortable');
      if (th && th.dataset.sort) sortTableRows(th.dataset.sort);
    });
    if ($.orderbookClose) $.orderbookClose.addEventListener('click', function() { $.orderbookPanel.classList.remove('show'); });

    if ($.setupRefreshBtn) $.setupRefreshBtn.addEventListener('click', function() {
      state.lastUsdtAvgTime = 0;
      updateUsdtAvg(function() { if (state.filter === 'rls') updateSetup(); else if (state.filter === 'usdt') updateSetupUsdt(); });
    });
    if ($.usdtAvgMTInput) $.usdtAvgMTInput.addEventListener('input', function() { if (state.filter === 'usdt' && Object.keys(state.stats).length) updateSetupUsdt(); });
  });
})();
