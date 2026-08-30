'use strict';

const assert = require('node:assert/strict');
const { SharedUtils: U } = require('../js/shared/utils.js');

function close(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${expected}, got ${actual}`);
}

// Exact target inside the second level: only part of that level must be consumed.
close(U.cumulUntilTarget([[10, 5], [20, 10]], 100), 100 / 7.5);

// Buying consumes asks; selling consumes bids.
const setup = U.computeSetup([[10, 5], [20, 10]], [[9, 5], [8, 10]], 90);
close(setup.buySetup, 90 / 7);
close(setup.sellSetup, 90 / 10.625);

// Insufficient liquidity must not produce a misleading partial average.
assert.equal(U.cumulUntilTarget([[10, 2]], 100), null);
assert.equal(U.cumulUntilTarget([], 100), null);
assert.equal(U.cumulUntilTarget([[10, 2]], 0), null);

// Arbitrage comparison directions.
close(U.diffUsdtBuySetup(90, 100), 100 / 90 * 100 - 100);
close(U.diffUsdtSellSetup(110, 100), 10);

// Multiplied market symbols such as 1M_PEPE.
assert.deepEqual(U.parseBaseMultiplier('1M_PEPE'), { symbol: 'pepe', factor: 1e6 });

console.log('setup logic tests passed');
