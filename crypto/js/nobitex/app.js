/**
 * Nobitex Live Prices - Main app. Uses shared modules.
 */
(function() {
  'use strict';
  if (window.ACTIVE_EXCHANGE && window.ACTIVE_EXCHANGE !== 'nobitex') return;
  var C = window.NobitexConfig || {};
  var Api = window.NobitexApi || {};
  var U = window.SharedUtils || {};
  var TV = window.TVApi || {};
  var Ndb = window.NetworkDb || {};

  var fmt = U.fmt, fmtRls = U.fmtRls, fmtPrice = U.fmtPrice, fmtPercent = U.fmtPercent, fmtUsdtSetup = U.fmtUsdtSetup;
  var fmtSetupDiff = U.fmtSetupDiff, parseBaseMultiplier = U.parseBaseMultiplier, hasPriceData = U.hasPriceData;
  var computeSetup = U.computeSetup, cumulUntilTarget = U.cumulUntilTarget;
  var diffUsdtBuySetup = U.diffUsdtBuySetup, diffUsdtSellSetup = U.diffUsdtSellSetup;

  var state = { filter: 'rls', sortCol: null, sortDir: 1, networkFilter: '', stats: {}, prevStats: {}, withdrawCoins: {}, networkDb: null,
    currentOrderbookBase: null, withdrawLoaded: false, tvPrices: {}, globalAvgBuyMT: null, globalAvgSellMT: null,
    lastUsdtAvgTime: 0, restPoll: null, restRetry: null, setupInterval: null, tvInterval: null,
    orderbooks: null, orderbooksFetchedAt: 0, orderbooksPromise: null };
  var $ = {};

  function initDom() {
    ['loading','error','priceTable','tbody','priceTableHeadRow','orderbookPanel','orderbookTitle','updateIntervalSec','networkFilter',
      'orderbookLoading','orderbookBody','orderbookPriceLine','orderbookAsksBody','orderbookBidsBody','orderbookClose',
      'orderbookTooltip','usdtBuy','usdtSell','usdtAvgMTInput','usdtAvgBuyMTLabel','usdtAvgSellMTLabel',
      'usdtAvgBuy100MT','usdtAvgSell100MT','lastUpdate','marketCount','connectionWarning','setupRefreshBtn']
      .forEach(function(id) { $[id] = document.getElementById(id); });
  }

  function getTVTitle() { return TV.getTitle ? TV.getTitle(C.TV_SOURCE) : 'Binance'; }
  function getTVPriceForBase(base) {
    var p = parseBaseMultiplier(base);
    if (p) { var v = state.tvPrices[p.symbol]; return v != null ? parseFloat(v) * p.factor : null; }
    var v = state.tvPrices[base]; return v != null ? parseFloat(v) : null;
  }
  function renderUsdtBuySetupCell(val, base) { var t = val != null ? fmtUsdtSetup(val) : '-'; return t + fmtSetupDiff(diffUsdtBuySetup(val, getTVPriceForBase(base))); }
  function renderUsdtSellSetupCell(val, base) { var t = val != null ? fmtUsdtSetup(val) : '-'; return t + fmtSetupDiff(diffUsdtSellSetup(val, getTVPriceForBase(base))); }

  function pairToSymbol(pair) { var p = pair.split('-'); return p[0].toUpperCase() + (p[1] === 'rls' ? 'IRT' : 'USDT'); }
  function mtToRls(mt) { var n = parseFloat(mt); return (Number.isFinite(n) && n > 0) ? n * 1e7 : (C.MT_DEFAULT || 1e9); }
  function getMT() { var v = $.usdtAvgMTInput ? parseFloat($.usdtAvgMTInput.value) : NaN; return (Number.isFinite(v) && v > 0) ? v : 100; }

  function getWithdrawNetworks(base) {
    var b = (base || '').toLowerCase(), keys = [b];
    var p = parseBaseMultiplier(base); if (p) keys.push(p.symbol.toLowerCase());
    for (var i = 0; i < keys.length; i++) { var n = state.withdrawCoins[keys[i]]; if (n && n.length) return n; }
    return [];
  }
  function withdrawEnabled(base) { return !state.withdrawLoaded || getWithdrawNetworks(base).length > 0; }

  function getPairTagsHtml(base) {
    return Ndb.renderPairTagsHtml ? Ndb.renderPairTagsHtml(base, state.networkDb, parseBaseMultiplier) : '';
  }

  function updateCell(el, val, prev) {
    if (!el) return;
    var n = parseFloat(val), p = parseFloat(prev);
    el.textContent = fmtPrice(val);
    el.classList.remove('flash-up','flash-down');
    if (prev !== undefined && p !== n) { el.classList.add(n > p ? 'flash-up' : 'flash-down'); setTimeout(function() { el.classList.remove('flash-up','flash-down'); }, 600); }
  }

  function setEl(el, v) { if (el) el.textContent = v != null ? fmtRls(v) : (v === null ? 'N/A' : '-'); }

  function updateUsdtAvg(onDone) {
    var mt = getMT();
    if ($.usdtAvgBuyMTLabel) $.usdtAvgBuyMTLabel.textContent = mt;
    if ($.usdtAvgSellMTLabel) $.usdtAvgSellMTLabel.textContent = mt;
    if (Date.now() - state.lastUsdtAvgTime < (C.USDT_AVG_THROTTLE_MS || 12000)) { if (typeof onDone === 'function') onDone(); return; }
    state.lastUsdtAvgTime = Date.now();
    Api.fetch('/v3/orderbook/USDTIRT').then(function(r) { return r.json(); }).then(function(d) {
      if (d.status !== 'ok' || !d.asks || !d.bids) { setEl($.usdtAvgBuy100MT, '-'); setEl($.usdtAvgSell100MT, '-'); }
      else {
        state.globalAvgBuyMT = cumulUntilTarget(d.asks, mtToRls(mt));
        state.globalAvgSellMT = cumulUntilTarget(d.bids, mtToRls(mt));
        setEl($.usdtAvgBuy100MT, state.globalAvgBuyMT);
        setEl($.usdtAvgSell100MT, state.globalAvgSellMT);
      }
      if (typeof onDone === 'function') onDone();
    }).catch(function() { if (typeof onDone === 'function') onDone(); });
  }

  function bindOrderbookTooltip(pair) {
    var tt = $.orderbookTooltip; if (!tt) return;
    var p = (pair || 'btc-rls').split('-'), dst = p[1] || 'rls', quoteUnit = dst === 'rls' ? 'RLS' : 'USDT';
    var rows = [].slice.call(document.querySelectorAll('#orderbookAsksBody tr, #orderbookBidsBody tr') || []);
    rows.forEach(function(r) { if (r._ttEnter) r.removeEventListener('mouseenter', r._ttEnter); if (r._ttLeave) r.removeEventListener('mouseleave', r._ttLeave); });
    function showTt(e) {
      var tr = e.target.closest('tr');
      var cum = parseFloat(tr && tr.dataset.cumTotal), amt = parseFloat(tr && tr.dataset.cumAmount), avg = parseFloat(tr && tr.dataset.avgPrice);
      if (!Number.isFinite(cum) || !Number.isFinite(amt)) return;
      var fmtAvg = Number.isFinite(avg) ? avg.toLocaleString('en-US', dst === 'rls' ? {maximumFractionDigits:0,minimumFractionDigits:0} : {maximumFractionDigits:2,minimumFractionDigits:0}) : '-';
      tt.innerHTML = '<dl><dt>Average Price</dt><dd>'+fmtAvg+' '+quoteUnit+'</dd><dt>Order Quantity</dt><dd>'+amt.toLocaleString('en-US',{maximumFractionDigits:6})+'</dd><dt>Total Order</dt><dd>'+cum.toLocaleString('en-US',{maximumFractionDigits:0,minimumFractionDigits:0})+' '+quoteUnit+'</dd></dl>';
      tt.style.display = 'block'; tt.style.left = (e.clientX + 12) + 'px'; tt.style.top = (e.clientY + 12) + 'px';
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
    var p = pair.split('-'), src = p[0], dst = p[1] || 'rls';
    var srcL = src.toUpperCase(), dstL = dst === 'rls' ? 'RLS' : 'USDT';
    $.orderbookPanel.classList.add('show');
    $.orderbookTitle.textContent = srcL + ' / ' + dstL;
    $.orderbookLoading.style.display = 'block';
    $.orderbookBody.style.display = 'none';
    state.currentOrderbookBase = src.toLowerCase();
    Api.fetch('/v3/orderbook/' + pairToSymbol(pair)).then(function(r) { return r.json(); }).then(function(d) {
      $.orderbookLoading.style.display = 'none';
      if (d.status !== 'ok' || !d.asks || !d.bids) {
        var msg = (d && d.message) ? (d.message + (d.code ? ' (' + d.code + ')' : '')) : 'No data for this market or market is closed.';
        $.orderbookAsksBody.innerHTML = '<tr><td colspan="3">' + msg + '</td></tr>';
        $.orderbookBidsBody.innerHTML = '';
      } else if (!(d.asks && d.asks.length) && !(d.bids && d.bids.length)) {
        $.orderbookAsksBody.innerHTML = '<tr><td colspan="3">Order book is empty.</td></tr>';
        $.orderbookBidsBody.innerHTML = '';
      } else {
        var asks = (d.asks || []).slice().reverse().slice(0, 50), bids = (d.bids || []).slice(0, 50);
        var last = d.lastTradePrice || (asks[0] && asks[0][0]) || (bids[0] && bids[0][0]);
        var bt = 0, ba = 0, bTot = bids.map(function(x) { bt += parseFloat(x[0]) * parseFloat(x[1]); return bt; });
        var bAmt = bids.map(function(x) { ba += parseFloat(x[1]); return ba; });
        var at = 0, aa = 0, aTot = [], aAmt = [];
        for (var i = asks.length - 1; i >= 0; i--) { at += parseFloat(asks[i][0]) * parseFloat(asks[i][1]); aa += parseFloat(asks[i][1]); aTot[i] = at; aAmt[i] = aa; }
        function mkRow(cls, cum, amt, px, a) { var ap = amt ? cum / amt : 0; return '<tr class="'+cls+'" data-cum-total="'+cum+'" data-cum-amount="'+amt+'" data-avg-price="'+ap+'"><td>'+fmtPrice(px)+'</td><td>'+parseFloat(a).toLocaleString('en-US',{maximumFractionDigits:6})+'</td><td>'+fmtPrice(parseFloat(px)*parseFloat(a))+'</td></tr>'; }
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
      var r = rows[i], base = (r.getAttribute('data-rls-pair') || r.getAttribute('data-pair') || '').replace(/-rls$|-usdt$/, '').toLowerCase();
      var c = r.querySelector('[data-field="tvPrice"]');
      if (c) { var tv = base ? getTVPriceForBase(base) : null; c.textContent = tv != null ? fmtUsdtSetup(tv) : '-'; }
      var usdtB = r.querySelector('[data-field="usdtBuy"]'), usdtS = r.querySelector('[data-field="usdtSell"]');
      if (base && usdtB) { var v = usdtB.dataset.usdtBuy ? parseFloat(usdtB.dataset.usdtBuy) : null; usdtB.innerHTML = renderUsdtBuySetupCell(v, base); }
      if (base && usdtS) { var v = usdtS.dataset.usdtSell ? parseFloat(usdtS.dataset.usdtSell) : null; usdtS.innerHTML = renderUsdtSellSetupCell(v, base); }
    }
  }

  function getTargetUsdt() {
    var effectiveUsdtBuyPrice = parseFloat(state.globalAvgBuyMT);
    if (!Number.isFinite(effectiveUsdtBuyPrice) || effectiveUsdtBuyPrice <= 0) return null;
    return mtToRls(getMT()) / effectiveUsdtBuyPrice;
  }

  function getAllOrderbooks() {
    if (state.orderbooks && Date.now() - state.orderbooksFetchedAt < (C.SETUP_INTERVAL_MS || 5000) - 250) return Promise.resolve(state.orderbooks);
    if (state.orderbooksPromise) return state.orderbooksPromise;
    state.orderbooksPromise = Api.fetch('/v3/orderbook/all').then(function(r) { return r.json(); }).then(function(d) {
      if (!d || d.status !== 'ok') throw new Error('Invalid all-orderbooks response');
      state.orderbooks = d;
      state.orderbooksFetchedAt = Date.now();
      return d;
    }).finally(function() { state.orderbooksPromise = null; });
    return state.orderbooksPromise;
  }

  function updateSetup() {
    if (state.filter !== 'rls' || !state.stats || typeof state.stats !== 'object') return;
    var tbody = $.tbody;
    var pairs = Object.keys(state.stats).filter(function(k) { return k.indexOf('-rls') !== -1 && withdrawEnabled(k.slice(0, -4)) && hasPriceData(state.stats[k]); }).map(function(k) { return [k, state.stats[k]]; }).sort(function(a, b) { return (b[1].volumeDst || 0) - (a[1].volumeDst || 0); });
    var target = mtToRls(getMT());
    getAllOrderbooks().then(function(books) {
      pairs.forEach(function(item) {
      var rlsPair = item[0];
      var row = tbody ? tbody.querySelector('tr[data-rls-pair="' + rlsPair + '"]') : null;
      if (!row) return;
      var d = books[pairToSymbol(rlsPair)];
        if (!d || !d.asks || !d.bids) return;
        var setup = computeSetup(d.asks, d.bids, target), base = rlsPair.slice(0, -4).toLowerCase();
        var usdtBuyVal = setup.buySetup != null && state.globalAvgSellMT > 0 ? setup.buySetup / state.globalAvgSellMT : null;
        var usdtSellVal = setup.sellSetup != null && state.globalAvgBuyMT > 0 ? setup.sellSetup / state.globalAvgBuyMT : null;
        var rlsB = row.querySelector('[data-field="rlsBuySetup"]'), rlsS = row.querySelector('[data-field="rlsSellSetup"]');
        var usdtB = row.querySelector('[data-field="usdtBuy"]'), usdtS = row.querySelector('[data-field="usdtSell"]');
        if (rlsB) rlsB.textContent = setup.buySetup != null ? fmtRls(setup.buySetup) : '-';
        if (rlsS) rlsS.textContent = setup.sellSetup != null ? fmtRls(setup.sellSetup) : '-';
        var diffBuy = diffUsdtBuySetup(usdtBuyVal, getTVPriceForBase(base)), diffSell = diffUsdtSellSetup(usdtSellVal, getTVPriceForBase(base));
        if (row) { row.dataset.diffUsdtBuy = diffBuy != null ? String(diffBuy) : ''; row.dataset.diffUsdtSell = diffSell != null ? String(diffSell) : ''; }
        if (usdtB) { usdtB.dataset.usdtBuy = usdtBuyVal != null ? String(usdtBuyVal) : ''; usdtB.innerHTML = renderUsdtBuySetupCell(usdtBuyVal, base); }
        if (usdtS) { usdtS.dataset.usdtSell = usdtSellVal != null ? String(usdtSellVal) : ''; usdtS.innerHTML = renderUsdtSellSetupCell(usdtSellVal, base); }
      });
    }).catch(function() { if ($.connectionWarning) $.connectionWarning.style.display = 'block'; });
  }

  function updateSetupUsdt() {
    if (state.filter !== 'usdt' || !state.stats || typeof state.stats !== 'object') return;
    var targetUsdt = getTargetUsdt();
    if (targetUsdt == null || targetUsdt <= 0) return;
    var tbody = $.tbody;
    var pairRows = tbody ? [].slice.call(tbody.querySelectorAll('tr[data-pair]')) : [];
    var pairs = pairRows.map(function(r) { return r.getAttribute('data-pair'); }).filter(Boolean);
    getAllOrderbooks().then(function(books) {
      pairs.forEach(function(pair) {
      var row = tbody ? tbody.querySelector('tr[data-pair="'+pair+'"]') : null;
      if (!row) return;
      var d = books[pairToSymbol(pair)];
        if (!d || !d.asks || !d.bids) return;
        var setup = computeSetup(d.asks, d.bids, targetUsdt);
        var base = pair.slice(0, -5).toLowerCase();
        var usdtB = row.querySelector('[data-field="usdtBuy"]'), usdtS = row.querySelector('[data-field="usdtSell"]');
        var usdtBuyVal = setup.buySetup;
        var usdtSellVal = setup.sellSetup;
        var diffBuy = diffUsdtBuySetup(usdtBuyVal, getTVPriceForBase(base)), diffSell = diffUsdtSellSetup(usdtSellVal, getTVPriceForBase(base));
        if (row) { row.dataset.diffUsdtBuy = diffBuy != null ? String(diffBuy) : ''; row.dataset.diffUsdtSell = diffSell != null ? String(diffSell) : ''; }
        if (usdtB) { usdtB.dataset.usdtBuy = usdtBuyVal != null ? String(usdtBuyVal) : ''; usdtB.innerHTML = renderUsdtBuySetupCell(usdtBuyVal, base); }
        if (usdtS) { usdtS.dataset.usdtSell = usdtSellVal != null ? String(usdtSellVal) : ''; usdtS.innerHTML = renderUsdtSellSetupCell(usdtSellVal, base); }
      });
    }).catch(function() { if ($.connectionWarning) $.connectionWarning.style.display = 'block'; });
  }

  function makeSortableTh(label, sortKey) { return '<th class="sortable" data-sort="'+sortKey+'" title="Click to sort">'+label+'</th>'; }
  function RLS_HEAD() { return '<th>Market</th><th>RLS Buy</th><th>RLS Sell</th><th>RLS Last</th>'+makeSortableTh('RLS 24h','dayChange')+'<th>RLS Sell Setup</th><th>RLS Buy Setup</th>'+makeSortableTh('USDT Sell Setup','diffUsdtSell')+makeSortableTh('USDT Buy Setup','diffUsdtBuy')+'<th title="'+getTVTitle()+'">'+getTVTitle()+'</th>'; }
  function USDT_HEAD() { return '<th>Market</th><th>USDT Buy</th><th>USDT Sell</th><th>USDT Last</th>'+makeSortableTh('USDT 24h','dayChange')+makeSortableTh('USDT Sell Setup','diffUsdtSell')+makeSortableTh('USDT Buy Setup','diffUsdtBuy')+'<th title="'+getTVTitle()+'">'+getTVTitle()+'</th>'; }

  function sortTableRows(sortKey) {
    var tbody = $.tbody; if (!tbody) return;
    var rows = [].slice.call(tbody.querySelectorAll('tr[data-rls-pair], tr[data-pair]') || []); if (!rows.length) return;
    var dir = (state.sortCol === sortKey) ? -state.sortDir : 1; state.sortCol = sortKey; state.sortDir = dir;
    function getVal(r) { var v = r.dataset[sortKey]; if (v === '' || v === undefined || v == null) return NaN; return parseFloat(v); }
    rows.sort(function(a, b) { var va = getVal(a), vb = getVal(b); if (Number.isFinite(va) && !Number.isFinite(vb)) return -1; if (!Number.isFinite(va) && Number.isFinite(vb)) return 1; if (!Number.isFinite(va) && !Number.isFinite(vb)) return 0; return dir * (va - vb); });
    rows.forEach(function(r) { tbody.appendChild(r); });
    [].slice.call(document.querySelectorAll('th.sortable') || []).forEach(function(th) { th.classList.remove('sort-asc','sort-desc'); if (th.dataset.sort === sortKey) th.classList.add(dir === 1 ? 'sort-asc' : 'sort-desc'); });
  }

  function getNetworksShort(base) {
    var nets = Ndb.getNetworks ? Ndb.getNetworks(base, state.networkDb, parseBaseMultiplier) : [];
    return nets.map(function(n) { return Ndb.shortName ? Ndb.shortName(n) : n; }).join(' ');
  }

  function renderTable(stats) {
    var thead = $.priceTableHeadRow, tbody = $.tbody; if (!thead || !tbody) return;
    var netFilter = state.networkFilter || '';
    var hasNetwork = Ndb.hasNetwork || function() { return true; };
    if (state.filter === 'rls') {
      thead.innerHTML = RLS_HEAD();
      var pairs = Object.keys(stats).filter(function(k) { return k.indexOf('-rls') !== -1 && withdrawEnabled(k.slice(0, -4)) && hasPriceData(stats[k]) && hasNetwork(k.slice(0, -4).toLowerCase(), netFilter, state.networkDb, parseBaseMultiplier); }).map(function(k) { return [k, stats[k]]; }).sort(function(a, b) { return (b[1].volumeDst || 0) - (a[1].volumeDst || 0); });
      var rowSignature = pairs.map(function(item) { return item[0]; }).join('|');
      var filterChanged = (tbody.dataset.netFilter || '') !== netFilter; tbody.dataset.netFilter = netFilter;
      if (!tbody.querySelector('tr[data-rls-pair]') || filterChanged || tbody.dataset.rowSignature !== rowSignature) {
        tbody.innerHTML = pairs.map(function(item) { var rlsPair = item[0], s = item[1], base = rlsPair.slice(0, -4), m = base.toUpperCase(), dc = (s.dayChange != null && s.dayChange !== '') ? String(s.dayChange) : '', tags = getPairTagsHtml(base), nets = getNetworksShort(base); return '<tr data-rls-pair="'+rlsPair+'" data-networks="'+nets+'" data-day-change="'+dc+'" onclick="event.stopPropagation(); window.NobitexApp.showOrderbook(\''+rlsPair+'\')"><td class="pair">'+m+tags+'</td><td class="price" data-field="rls-bestBuy"></td><td class="price" data-field="rls-bestSell"></td><td class="price" data-field="rls-latest"></td><td class="positive" data-field="rls-dayChange"></td><td class="price" data-field="rlsSellSetup"></td><td class="price" data-field="rlsBuySetup"></td><td class="price" data-field="usdtSell"></td><td class="price" data-field="usdtBuy"></td><td class="price" data-field="tvPrice"></td></tr>'; }).join('');
        tbody.dataset.rowSignature = rowSignature;
      }
      pairs.forEach(function(item) { var rlsPair = item[0], row = tbody.querySelector('tr[data-rls-pair="'+rlsPair+'"]'); if (!row) return; var s = stats[rlsPair] || {}, prev = state.prevStats[rlsPair] || {}; ['bestBuy','bestSell','latest','dayChange'].forEach(function(f) { var c = row.querySelector('[data-field="rls-'+f+'"]'); if (!c) return; if (f === 'dayChange') { c.textContent = fmtPercent(s.dayChange); c.className = (parseFloat(s.dayChange || 0) >= 0) ? 'positive' : 'negative'; row.dataset.dayChange = (s.dayChange != null && s.dayChange !== '') ? String(s.dayChange) : ''; } else updateCell(c, s[f], prev[f]); }); state.prevStats[rlsPair] = Object.assign({}, s); });
      if ($.marketCount) $.marketCount.textContent = pairs.length;
    } else {
      thead.innerHTML = USDT_HEAD();
      var usdtPairs = Object.keys(stats).filter(function(k) { return k.indexOf('-usdt') !== -1 && hasPriceData(stats[k]) && hasNetwork(k.slice(0, -5).toLowerCase(), netFilter, state.networkDb, parseBaseMultiplier); }).map(function(k) { return [k, stats[k]]; }).sort(function(a, b) { return (b[1].volumeDst || 0) - (a[1].volumeDst || 0); });
      var rowSignature = usdtPairs.map(function(item) { return item[0]; }).join('|');
      var filterChanged = (tbody.dataset.netFilter || '') !== netFilter; tbody.dataset.netFilter = netFilter;
      if (!tbody.querySelector('tr[data-pair]') || tbody.querySelector('tr[data-rls-pair]') || filterChanged || tbody.dataset.rowSignature !== rowSignature) { tbody.innerHTML = usdtPairs.map(function(item) { var pair = item[0], s = item[1], base = pair.slice(0, -5), m = base.toUpperCase(), tags = getPairTagsHtml(base), nets = getNetworksShort(base), dc = (s.dayChange != null && s.dayChange !== '') ? String(s.dayChange) : ''; return '<tr data-pair="'+pair+'" data-networks="'+nets+'" data-day-change="'+dc+'" onclick="event.stopPropagation(); window.NobitexApp.showOrderbook(\''+pair+'\')"><td class="pair">'+m+tags+'</td><td class="price" data-field="bestBuy"></td><td class="price" data-field="bestSell"></td><td class="price" data-field="latest"></td><td class="positive" data-field="dayChange"></td><td class="price" data-field="usdtSell"></td><td class="price" data-field="usdtBuy"></td><td class="price" data-field="tvPrice"></td></tr>'; }).join(''); tbody.dataset.rowSignature = rowSignature; }
      usdtPairs.forEach(function(item) { var pair = item[0], s = item[1], row = tbody.querySelector('tr[data-pair="'+pair+'"]'); if (!row) return; var prev = state.prevStats[pair] || {}; ['bestBuy','bestSell','latest','dayChange'].forEach(function(f) { var c = row.querySelector('[data-field="'+f+'"]'); if (!c) return; if (f === 'dayChange') { c.textContent = fmtPercent(s.dayChange); c.className = (parseFloat(s.dayChange || 0) >= 0) ? 'positive' : 'negative'; row.dataset.dayChange = (s.dayChange != null && s.dayChange !== '') ? String(s.dayChange) : ''; } else updateCell(c, s[f], prev[f]); }); state.prevStats[pair] = Object.assign({}, s); });
      if ($.marketCount) $.marketCount.textContent = usdtPairs.length;
    }
    if ($.lastUpdate) $.lastUpdate.textContent = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    updateTVCells();
    var ur = stats['usdt-rls']; if (ur) { if ($.usdtBuy) $.usdtBuy.textContent = fmtPrice(ur.bestSell); if ($.usdtSell) $.usdtSell.textContent = fmtPrice(ur.bestBuy); }
    updateUsdtAvg();
  }

  function showError(msg) { if ($.error) { $.error.textContent = msg; $.error.style.display = 'block'; } if ($.loading) $.loading.style.display = 'none'; if ($.priceTable) $.priceTable.style.display = 'table'; }

  function pollStats() { Api.fetch('/market/stats?_=' + Date.now()).then(function(r) { return r.json(); }).then(function(d) { if (d.status === 'ok' && d.stats) { state.stats = d.stats; if ($.connectionWarning) $.connectionWarning.style.display = 'none'; renderTable(state.stats); } else { throw new Error('Invalid market stats response'); } }).catch(function() { if ($.connectionWarning) $.connectionWarning.style.display = 'block'; }); }

  function initRest() {
    if (state.restRetry) { clearTimeout(state.restRetry); state.restRetry = null; }
    Api.fetch('/market/stats?_=' + Date.now()).then(function(r) { return r.json(); }).then(function(d) {
      if (d.status === 'ok' && d.stats) {
        state.stats = d.stats; state.prevStats = {};
        if ($.loading) $.loading.style.display = 'none'; if ($.priceTable) $.priceTable.style.display = 'table'; if ($.error) $.error.style.display = 'none'; if ($.connectionWarning) $.connectionWarning.style.display = 'none';
        if (state.restRetry) { clearTimeout(state.restRetry); state.restRetry = null; }
        renderTable(state.stats);
        if (!state.setupInterval) { state.setupInterval = setInterval(function() { if (state.filter === 'rls') updateSetup(); else if (state.filter === 'usdt') updateSetupUsdt(); }, C.SETUP_INTERVAL_MS || 5000); updateSetup(); updateSetupUsdt(); }
        if (!state.restPoll) state.restPoll = setInterval(pollStats, C.REST_POLL_MS || 5000);
      } else showError('Invalid response from server');
    }).catch(function() {
      if (state.restRetry) { clearTimeout(state.restRetry); state.restRetry = null; }
      if (Object.keys(state.stats).length) { if ($.connectionWarning) $.connectionWarning.style.display = 'block'; if ($.error) $.error.style.display = 'none'; if ($.priceTable) $.priceTable.style.display = 'table'; if ($.loading) $.loading.style.display = 'none'; state.restRetry = setTimeout(initRest, 3000); }
      else { showError('Connection error. Serve via HTTP (e.g. GitHub Pages) or check internet.'); state.restRetry = setTimeout(initRest, 5000); }
    });
  }

  window.NobitexApp = { showOrderbook: showOrderbook };

  document.addEventListener('DOMContentLoaded', function() {
    initDom();
    if ($.updateIntervalSec) $.updateIntervalSec.textContent = Math.round((C.REST_POLL_MS || 5000) / 1000);
    state.networkDb = Ndb.DB || {};
    function applyNetworkDb(d) { if (d && Object.keys(d).length) { state.networkDb = d; fillNetworkFilter(); if (Object.keys(state.stats).length) renderTable(state.stats); } }
    (Ndb.fetchFromApi && Ndb.fetchFromApi().then(applyNetworkDb).catch(function() {
      fetch('data/nobitex-withdraw-networks.json', { cache: 'no-store' }).then(function(r) { return r.json(); }).then(applyNetworkDb).catch(function() {});
    })) || fetch('data/nobitex-withdraw-networks.json', { cache: 'no-store' }).then(function(r) { return r.json(); }).then(applyNetworkDb).catch(function() {});
    if (Ndb.fetchFromApi && Ndb.REFRESH_INTERVAL_MS) setInterval(function() { Ndb.fetchFromApi().then(applyNetworkDb).catch(function() {}); }, Ndb.REFRESH_INTERVAL_MS);
    Api.fetchWithdraw && Api.fetchWithdraw(function(next) { state.withdrawCoins = next; state.withdrawLoaded = true; if (Object.keys(state.stats).length) renderTable(state.stats); }, 2);
    initRest();
    if (TV.fetch) TV.fetch(C.TV_SOURCE, function(prices) { state.tvPrices = prices; updateTVCells(); });
    if (!state.tvInterval) state.tvInterval = setInterval(function() { if (TV.fetch) TV.fetch(C.TV_SOURCE, function(prices) { state.tvPrices = prices; updateTVCells(); }); }, C.TV_INTERVAL_MS || 5000);
    document.querySelectorAll('.tab[data-filter]').forEach(function(btn) { btn.addEventListener('click', function() { document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); }); this.classList.add('active'); state.filter = this.getAttribute('data-filter'); if (Object.keys(state.stats).length) { renderTable(state.stats); if (state.filter === 'rls') updateSetup(); else updateSetupUsdt(); } }); });
    function fillNetworkFilter() { var sel = $.networkFilter; if (!sel) return; var opts = Ndb.getAllNetworkShortNames ? Ndb.getAllNetworkShortNames(state.networkDb) : []; sel.innerHTML = '<option value="">All networks</option>' + opts.map(function(n) { return '<option value="'+n+'">'+n+'</option>'; }).join(''); }
    fillNetworkFilter();
    $.networkFilter && $.networkFilter.addEventListener('change', function() { state.networkFilter = (this.value || ''); if (Object.keys(state.stats).length) renderTable(state.stats); });
    $.priceTable && $.priceTable.addEventListener('click', function(e) { var th = e.target.closest('th.sortable'); if (th && th.dataset.sort) sortTableRows(th.dataset.sort); });
    $.orderbookClose && $.orderbookClose.addEventListener('click', function() { $.orderbookPanel.classList.remove('show'); });
    $.setupRefreshBtn && $.setupRefreshBtn.addEventListener('click', function() { state.lastUsdtAvgTime = 0; updateUsdtAvg(function() { if (state.filter === 'rls') updateSetup(); else if (state.filter === 'usdt') updateSetupUsdt(); }); });
    $.usdtAvgMTInput && $.usdtAvgMTInput.addEventListener('input', function() { state.lastUsdtAvgTime = 0; });
  });
})();
