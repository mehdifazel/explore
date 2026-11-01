const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = 4173;
const root = path.join(__dirname, 'dist');
const upstream = 'https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionMarketWatch/1';
let cached = null;
let cachedAt = 0;
let legacyBook = null;
let legacyBookAt = 0;

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

async function options(res) {
  if (cached && Date.now() - cachedAt < 15000) return send(res, 200, cached, 'application/json; charset=utf-8');
  try {
    const response = await fetch(upstream, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Option Chain Local Dashboard)' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`TSETMC returned ${response.status}`);
    cached = await response.text();
    cachedAt = Date.now();
    send(res, 200, cached, 'application/json; charset=utf-8');
  } catch (error) {
    if (cached) return send(res, 200, cached, 'application/json; charset=utf-8');
    send(res, 502, JSON.stringify({ error: 'TSETMC connection failed' }), 'application/json; charset=utf-8');
  }
}

async function orderBook(res, code) {
  if (!/^\d{5,20}$/.test(code)) return send(res, 400, JSON.stringify({ error: 'Invalid instrument code' }), 'application/json; charset=utf-8');
  try {
    const response = await fetch(`https://cdn.tsetmc.com/api/BestLimits/${code}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Option Chain Local Dashboard)' },
      signal: AbortSignal.timeout(20000),
    });
    if (response.ok) return send(res, 200, await response.text(), 'application/json; charset=utf-8');
    throw new Error(`TSETMC returned ${response.status}`);
  } catch (error) {
    try {
      if (!legacyBook || Date.now() - legacyBookAt > 15000) {
        const legacy = await fetch('http://old.tsetmc.com/tsev2/data/MarketWatchPlus.aspx?h=0&r=0', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Option Chain Local Dashboard)' }, signal: AbortSignal.timeout(25000),
        });
        if (!legacy.ok) throw new Error('Legacy market watch unavailable');
        legacyBook = (await legacy.text()).split('@')[3] || '';
        legacyBookAt = Date.now();
      }
      const bestLimits = legacyBook.split(';').filter(row => row.startsWith(`${code},`)).map(row => {
        const [insCode, number, zo, zd, pd, po, qd, qo] = row.split(',');
        return { insCode, number, zo, zd, pd, po, qd, qo };
      });
      send(res, 200, JSON.stringify({ bestLimits }), 'application/json; charset=utf-8');
    } catch {
      send(res, 502, JSON.stringify({ error: 'TSETMC order book connection failed' }), 'application/json; charset=utf-8');
    }
  }
}

async function sellQuoteCodes(res) {
  try {
    if (!legacyBook || Date.now() - legacyBookAt > 15000) {
      const legacy = await fetch('http://old.tsetmc.com/tsev2/data/MarketWatchPlus.aspx?h=0&r=0', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Option Chain Local Dashboard)' }, signal: AbortSignal.timeout(25000),
      });
      if (!legacy.ok) throw new Error('Legacy market watch unavailable');
      legacyBook = (await legacy.text()).split('@')[3] || '';
      legacyBookAt = Date.now();
    }
    const sellCodes = [], buyCodes = [], sellQuotes = {};
    legacyBook.split(';').forEach(row => {
      const [insCode, , , , bidPrice, offerPrice, bidVolume, offerVolume] = row.split(',');
      if (!/^\d{5,20}$/.test(insCode)) return;
      if (Number(offerPrice) > 0 && Number(offerVolume) > 0) {
        sellCodes.push(insCode);
        sellQuotes[insCode] = Number(offerPrice);
      }
      if (Number(bidPrice) > 0 && Number(bidVolume) > 0) buyCodes.push(insCode);
    });
    send(res, 200, JSON.stringify({ codes: sellCodes, sellCodes, buyCodes, sellQuotes }), 'application/json; charset=utf-8');
  } catch {
    send(res, 502, JSON.stringify({ error: 'TSETMC order book connection failed' }), 'application/json; charset=utf-8');
  }
}

http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (pathname === '/api/options') return void options(res);
  if (pathname === '/api/orderbook') return void orderBook(res, new URL(req.url, `http://${req.headers.host}`).searchParams.get('code') || '');
  if (pathname === '/api/sell-quote-codes') return void sellQuoteCodes(res);
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.resolve(root, requested);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream';
  send(res, 200, fs.readFileSync(file), type);
}).listen(port, '127.0.0.1', () => console.log(`Option Chain running at http://localhost:${port}`));
