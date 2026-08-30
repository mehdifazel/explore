/**
 * Shared withdraw network data and display helpers.
 * Used by Nobitex and Wallex orderbook panels.
 * Update: run scripts/build-withdraw-db.ps1 then copy from data/nobitex-withdraw-networks.json
 */
(function(global) {
  'use strict';

  var DB = {"meme":["ERC20"],"crv":["ERC20"],"uni":["ERC20","BEP20 (BSC)"],"ena":["ERC20"],"egld":["MultiversX eGold"],"w":["Solana"],"rls":["FIAT"],"sushi":["ERC20"],"ssv":["ERC20"],"usdc":["BEP20 (BSC)"],"hot":["ERC20"],"1inch":["ERC20","BEP20 (BSC)"],"kaito":["BASE"],"celr":["ERC20"],"imx":["ERC20"],"hype":["Hyperliquid HyperEVM"],"sfp":["BEP20 (BSC)"],"xrp":["XRP"],"wld":["ERC20"],"a":["Vaulta"],"turbo":["ERC20"],"jst":["TRC20"],"hbar":["Hedera Hashgraph"],"zil":["BEP20 (BSC)"],"auction":["ERC20"],"link":["ERC20","BEP20 (BSC)"],"bch":["BCH"],"dood":["Solana"],"rpl":["ERC20"],"omg":["ERC20"],"pendle":["ERC20"],"aave":["BEP20 (BSC)"],"hmstr":["TON (the open network)"],"dai":["Polygon","Arbitrum one"],"1m_pepe":["ERC20"],"mmt":["SUI"],"1m_nft":["TRC20"],"skl":["ERC20"],"flow":["Flow"],"degen":["BASE"],"super":["ERC20"],"strk":["ERC20"],"ondo":["ERC20"],"avnt":["BASE"],"bnt":["ERC20"],"1b_babydoge":["BEP20 (BSC)"],"qnt":["ERC20"],"cati":["TON (the open network)"],"brev":["ERC20"],"tnsr":["Solana"],"one":["Harmony"],"snt":["ERC20"],"sky":["ERC20"],"dexe":["ERC20"],"100k_floki":["BEP20 (BSC)"],"red":["ERC20"],"pnut":["Solana"],"sun":["TRC20"],"mdt":["ERC20"],"aevo":["ERC20"],"ankr":["ERC20"],"wif":["Solana"],"layer":["Solana"],"eth":["ERC20","Arbitrum one","BEP20 (BSC)","BASE"],"anime":["Arbitrum one"],"bat":["ERC20"],"ctc":["ERC20"],"nmr":["ERC20"],"grt":["ERC20"],"form":["BEP20 (BSC)"],"eul":["ERC20"],"lqty":["ERC20"],"zent":["ERC20"],"fet":["ERC20"],"near":["NEAR Protocol"],"orbs":["ERC20"],"eigen":["ERC20"],"at":["BEP20 (BSC)"],"woo":["ERC20"],"mew":["Solana"],"1k_shib":["ERC20","BEP20 (BSC)"],"snx":["ERC20"],"jto":["Solana"],"safe":["ERC20"],"cow":["ERC20"],"kmno":["Solana"],"aixbt":["BASE"],"wet":["Solana"],"usdt":["Polygon","BEP20 (BSC)"],"toshi":["BASE"],"bigtime":["ERC20"],"pengu":["Solana"],"ilv":["ERC20"],"bico":["ERC20"],"morpho":["ERC20"],"wbtc":["ERC20"],"comp":["ERC20"],"major":["TON (the open network)"],"dogs":["TON (the open network)"],"neiro":["ERC20"],"orca":["Solana"],"avax":["Avalanche"],"1k_cat":["BEP20 (BSC)"],"1k_bonk":["Solana"],"dao":["ERC20"],"bnb":["BEP20 (BSC)"],"cgpt":["BEP20 (BSC)"],"rdnt":["Arbitrum one"],"1m_btt":["TRC20"],"syrup":["BASE","ERC20"],"ygg":["ERC20"],"bome":["Solana"],"ape":["ERC20"],"algo":["Algorand"],"linea":["LINEA"],"ltc":["LTC"],"zen":["BASE"],"sei":["SEI"],"lpt":["ERC20"],"cvc":["ERC20"],"goat":["Solana"],"bio":["ERC20"],"vine":["Solana"],"zora":["BASE"],"io":["Solana"],"fluid":["ERC20"],"lrc":["ERC20"],"bal":["ERC20"],"doge":["Dogecoin"],"ada":["Cardano"],"id":["ERC20"],"yfi":["ERC20"],"pol":["Polygon"],"prove":["ERC20"],"jasmy":["ERC20"],"chz":["ERC20"],"cookie":["BEP20 (BSC)"],"people":["ERC20"],"not":["TON (the open network)"],"apt":["Aptos"],"banana":["ERC20"],"fil":["Filecoin"],"2z":["Solana"],"zrx":["ERC20"],"pha":["ERC20"],"badger":["ERC20"],"ldo":["ERC20"],"perp":["ERC20"],"knc":["ERC20"],"cake":["BEP20 (BSC)"],"agld":["ERC20"],"aster":["BEP20 (BSC)"],"sahara":["ERC20"],"sol":["Solana"],"arb":["Arbitrum one"],"ethfi":["ERC20"],"sign":["BASE"],"la":["ERC20"],"ton":["TON (the open network)"],"coti":["ERC20"],"1k_cheems":["BEP20 (BSC)"],"glm":["ERC20"],"blur":["ERC20"],"ath":["ERC20"],"etc":["Ethereum Classic"],"mana":["ERC20"],"api3":["ERC20"],"zro":["ERC20"],"ens":["ERC20"],"acx":["ERC20"],"prom":["ERC20"],"act":["Solana"],"slp":["ERC20"],"giggle":["BEP20 (BSC)"],"kite":["ERC20"],"spk":["ERC20"],"atom":["Cosmos"],"ach":["ERC20"],"storj":["ERC20"],"rsr":["ERC20"],"usde":["ERC20"],"pgala":["BEP20 (BSC)"],"cvx":["ERC20"],"gmt":["BEP20 (BSC)"],"sui":["Sui"],"op":["Optimism"],"sand":["ERC20"],"alpha":["ERC20"],"t":["ERC20"],"xai":["Arbitrum one"],"magic":["Arbitrum one"],"wal":["SUI"],"gmx":["Arbitrum one"],"axs":["ERC20","BEP20 (BSC)"],"virtual":["BASE"],"pump":["Solana"],"band":["ERC20"],"s":["Sonic"],"moodeng":["Solana"],"pyth":["Solana"],"btc":["BTC","Lightning","BEP20 (BSC)"],"enj":["Enjin Relay Chain"],"waxp":["ERC20"],"g":["ERC20"],"stg":["ERC20"],"aero":["BASE"],"zkc":["ERC20"],"rlc":["ERC20"],"render":["Solana"],"ray":["Solana"],"x":["TON (the open network)"],"kernel":["ERC20"],"dydx":["DYDX"],"twt":["BEP20 (BSC)"],"xvs":["BEP20 (BSC)"],"beamx":["ERC20"],"bard":["ERC20"],"mask":["ERC20"],"me":["Solana"],"xtz":["Tezos"],"trx":["TRC20"],"jup":["Solana"],"trb":["ERC20"],"pixel":["ERC20"],"egala":["ERC20"],"edu":["BEP20 (BSC)"],"met":["Solana"],"uma":["ERC20"],"lit":["ERC20"],"move":["ERC20"],"powr":["ERC20"],"dot":["Asset Hub Polkadot","ERC20"],"xlm":["Stellar Lumens"]};

  /** Muted, darker palette for inline tags */
  var COLORS = {"ERC20":"#3d4a6e","BEP20 (BSC)":"#6e5a24","TRC20":"#7a2d2d","Solana":"#1e5e4a","XRP":"#2d2d38","BCH":"#445a2a","BTC":"#8a5a14","LTC":"#4a4a4a","DOGE":"#5e5a1e","MATIC":"#42385e","AVAX":"#6e2a2a","BASE":"#1e3a6e","Arbitrum one":"#2a4a6e","Optimism":"#6e1e2a","FIAT":"#1e5a38","MultiversX eGold":"#1e6a5e","Hedera Hashgraph":"#1e425e","Hyperliquid HyperEVM":"#4a3e6e","Vaulta":"#4a3e6e","Lightning":"#8a5a14"};

  function getColor(network) {
    if (COLORS[network]) return COLORS[network];
    var h = 0;
    for (var i = 0; i < network.length; i++) h = ((h << 5) - h) + network.charCodeAt(i) | 0;
    return 'hsl(' + Math.abs(h % 360) + ', 25%, 36%)';
  }

  /** Display only part before first space (e.g. "BEP20 (BSC)" -> "BEP20") */
  function shortName(network) {
    if (!network) return '';
    var idx = network.indexOf(' ');
    return idx >= 0 ? network.substring(0, idx) : network;
  }

  function renderPairTagsHtml(base, dbOverride, parseBaseMultiplier) {
    var nets = getNetworks(base, dbOverride, parseBaseMultiplier);
    if (!nets.length) return '';
    return nets.map(function(n) {
      var label = shortName(n);
      var fee = getFee(base, n, dbOverride, parseBaseMultiplier);
      var title = (fee && fee.amount) ? ('Withdraw fee: ' + fee.amount + ' ' + (fee.coin || '') + ' · ' + n) : n;
      title = title.replace(/"/g, '&quot;');
      return '<span class="pair-net-tag" style="background:' + getColor(n) + '" title="' + title + '">' + label + '</span>';
    }).join('');
  }

  /** Get unique short network names for filter dropdown */
  function getAllNetworkShortNames(dbOverride) {
    var db = (dbOverride && Object.keys(dbOverride).length) ? dbOverride : DB;
    var set = {};
    Object.keys(db).forEach(function(k) { getNetworksArray(db[k]).forEach(function(n) { set[shortName(n)] = true; }); });
    return Object.keys(set).filter(Boolean).sort();
  }

  /** Check if coin has the given network (by short name) */
  function hasNetwork(base, shortFilter, dbOverride, parseBaseMultiplier) {
    if (!shortFilter) return true;
    var nets = getNetworks(base, dbOverride, parseBaseMultiplier);
    return nets.some(function(n) { return shortName(n) === shortFilter; });
  }

  /** Normalize entry: supports { networks: [...] } or legacy array */
  function getNetworksArray(entry) {
    if (!entry) return [];
    if (Array.isArray(entry)) return entry;
    if (entry.networks && Array.isArray(entry.networks)) return entry.networks;
    return [];
  }

  function getNetworks(base, dbOverride, parseBaseMultiplier) {
    var b = (base || '').toLowerCase();
    var parsed = parseBaseMultiplier ? parseBaseMultiplier(base) : null;
    var keys = [b];
    if (parsed) keys.push(parsed.symbol.toLowerCase());
    var db = (dbOverride && Object.keys(dbOverride).length) ? dbOverride : DB;
    for (var i = 0; i < keys.length; i++) {
      var entry = db[keys[i]];
      var nets = getNetworksArray(entry);
      if (nets.length) return nets;
    }
    return [];
  }

  /** Get withdrawal fee for coin+network: { amount, coin } or null */
  function getFee(base, network, dbOverride, parseBaseMultiplier) {
    var b = (base || '').toLowerCase();
    var parsed = parseBaseMultiplier ? parseBaseMultiplier(base) : null;
    var keys = [b];
    if (parsed) keys.push(parsed.symbol.toLowerCase());
    var db = (dbOverride && Object.keys(dbOverride).length) ? dbOverride : DB;
    for (var i = 0; i < keys.length; i++) {
      var entry = db[keys[i]];
      if (entry && entry.fees && entry.fees[network]) return entry.fees[network];
    }
    return null;
  }

  function renderTags(el, base, dbOverride, parseBaseMultiplier) {
    if (!el) return;
    var nets = getNetworks(base, dbOverride, parseBaseMultiplier);
    if (!nets.length) { el.innerHTML = '<span class="orderbook-network-tag" style="background:#444;opacity:.7">No networks</span>'; return; }
    el.innerHTML = nets.map(function(n) { return '<span class="orderbook-network-tag" style="background:' + getColor(n) + '" title="' + (n.replace(/"/g, '&quot;')) + '">' + n + '</span>'; }).join('');
  }

  var API_URL = 'https://apiv2.nobitex.ir/v2/options';
  var REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

  function parseFee(s) {
    if (!s) return null;
    var clean = String(s).replace(/_/g, '');
    var num = parseFloat(clean);
    return isFinite(num) ? num.toString() : s;
  }

  /** Fetch networks + fees from Nobitex API. Returns promise<db> or rejects. */
  function fetchFromApi() {
    return fetch(API_URL, { cache: 'no-store' }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.status !== 'ok' || !Array.isArray(data.coins)) return {};
      var next = {};
      data.coins.forEach(function(c) {
        var coin = (c.coin || '').toLowerCase();
        if (!coin) return;
        var list = c.networkList || {};
        var networks = [];
        var fees = {};
        var coinUpper = (c.coin || '').toUpperCase();
        Object.keys(list).forEach(function(k) {
          var n = list[k];
          if (!n || !n.withdrawEnable) return;
          var name = n.name || n.network || '';
          if (!name) return;
          networks.push(name);
          var feeAmount = parseFee(n.withdrawFee);
          if (feeAmount) fees[name] = { amount: feeAmount, coin: coinUpper };
        });
        if (networks.length) next[coin] = { networks: networks, fees: Object.keys(fees).length ? fees : undefined };
      });
      return next;
    });
  }

  global.NetworkDb = { DB: DB, COLORS: COLORS, API_URL: API_URL, REFRESH_INTERVAL_MS: REFRESH_INTERVAL_MS, getColor: getColor, getNetworks: getNetworks, getFee: getFee, shortName: shortName, getAllNetworkShortNames: getAllNetworkShortNames, hasNetwork: hasNetwork, renderTags: renderTags, renderPairTagsHtml: renderPairTagsHtml, fetchFromApi: fetchFromApi };
})(typeof window !== 'undefined' ? window : this);
