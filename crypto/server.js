'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname);

function loadLocalEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

loadLocalEnv();
const port = Number.parseInt(process.env.CRYPTO_PORT || '8080', 10);
const wallexApiKey = process.env.WALLEX_API_KEY || '';
const wallexNetworkCache = new Map();
const WALLEX_NETWORK_CACHE_MS = 15 * 60 * 1000;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function send(res, status, body, contentType) {
  res.writeHead(status, {
    'Content-Type': contentType || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

async function proxyWallex(req, res, url) {
  if (req.method !== 'GET') return send(res, 405, 'Method not allowed');
  const upstreamPath = url.pathname.slice('/api/wallex'.length) || '/';
  const upstream = new URL(upstreamPath + url.search, 'https://api.wallex.ir');
  try {
    const response = await fetch(upstream, { headers: { Accept: 'application/json' } });
    const body = Buffer.from(await response.arrayBuffer());
    send(res, response.status, body, response.headers.get('content-type') || 'application/json; charset=utf-8');
  } catch (error) {
    send(res, 502, JSON.stringify({ success: false, message: 'Wallex upstream unavailable' }), 'application/json; charset=utf-8');
  }
}

function normalizeWalletNetworks(data) {
  const wallets = data && data.result && data.result.wallets;
  if (!wallets || typeof wallets !== 'object') return [];
  const isAvailable = (value) => {
    const normalized = String(value == null ? '' : value).trim().toLowerCase();
    return value === true || value === 1 || ['true', 'available', 'enable', 'enabled', 'active'].includes(normalized);
  };
  return Object.values(wallets).map((wallet) => {
    const network = wallet && wallet.network ? wallet.network : {};
    const withdrawalAvailability = network.withdrawal_availability ?? wallet.withdrawal_availability ?? network.withdrawalAvailability ?? wallet.withdrawalAvailability;
    const depositAvailability = network.deposit_availability ?? wallet.deposit_availability ?? network.depositAvailability ?? wallet.depositAvailability;
    return {
      id: String(network.id || '').trim(),
      name: String(network.name || network.id || '').trim(),
      withdrawalAvailable: isAvailable(withdrawalAvailability),
      depositAvailable: isAvailable(depositAvailability),
      withdrawalReason: network.withdrawal_unavailability_reason || '',
      transactionFee: wallet.transaction_fee == null ? null : String(wallet.transaction_fee),
      minWithdrawal: wallet.min_withdrawal_value == null ? null : String(wallet.min_withdrawal_value)
    };
  }).filter((network) => network.id || network.name);
}

async function fetchWallexNetworks(symbol) {
  const cached = wallexNetworkCache.get(symbol);
  if (cached && Date.now() - cached.time < WALLEX_NETWORK_CACHE_MS) return cached.networks;
  const response = await fetch(`https://api.wallex.ir/v1/account/wallets/${encodeURIComponent(symbol.toLowerCase())}`, {
    headers: { Accept: 'application/json', 'x-api-key': wallexApiKey }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.message || `Wallex HTTP ${response.status}`);
  const networks = normalizeWalletNetworks(data);
  wallexNetworkCache.set(symbol, { time: Date.now(), networks });
  return networks;
}

async function wallexNetworks(req, res, url) {
  if (req.method !== 'GET') return send(res, 405, 'Method not allowed');
  if (!wallexApiKey) {
    return send(res, 503, JSON.stringify({ success: false, code: 'WALLEX_API_KEY_MISSING', message: 'Set WALLEX_API_KEY on the server' }), 'application/json; charset=utf-8');
  }
  const symbols = [...new Set((url.searchParams.get('symbols') || '').split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => /^[A-Z0-9]{1,20}$/.test(symbol)))].slice(0, 250);
  if (!symbols.length) return send(res, 400, JSON.stringify({ success: false, message: 'No valid symbols' }), 'application/json; charset=utf-8');

  const result = {};
  let next = 0;
  async function worker() {
    while (next < symbols.length) {
      const symbol = symbols[next++];
      try { result[symbol] = await fetchWallexNetworks(symbol); }
      catch (error) { result[symbol] = { error: error.message || 'Network lookup failed' }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, symbols.length) }, worker));
  send(res, 200, JSON.stringify({ success: true, result }), 'application/json; charset=utf-8');
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'Bad request'); }
  if (pathname === '/') pathname = '/crypto-arbitrage.html';
  const filePath = path.resolve(root, '.' + pathname);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) return send(res, 403, 'Forbidden');
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) return send(res, 404, 'Not found');
    res.writeHead(200, {
      'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/wallex-private/networks') return wallexNetworks(req, res, url);
  if (url.pathname === '/api/wallex' || url.pathname.startsWith('/api/wallex/')) return proxyWallex(req, res, url);
  return serveStatic(req, res, url);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Crypto dashboard: http://localhost:${port}/crypto-arbitrage.html`);
});
