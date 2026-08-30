# Nobitex API Changelog

**Source:** https://apidocs.nobitex.ir/changelog/

This document records changes for each API version.

## Major API Changes

### June 2025
- Added additional information for rate limiting
- Deprecation of old orderbook version
- Base API URL change

### September 2024
- Added "Order List: Orderbook" channel to WebSocket
- WebSocket support added
- Orderbook v3 endpoint added and v2 deprecated

### August 2024
- Ability to receive orders sorted by registration time, ID, and price (ascending/descending) in order list

### October 2023
- Added perpetual buy (margin) trading

### August 2023
- Added leverage to perpetual sell

### May 2023
- Added market, stop loss, and OCO order types to perpetual sell

### February 2023
- Added perpetual sell trading

### August 2022
- Added minute candlesticks to OHLC

### April 2022
- OCO order support

### March 2022
- Gift card sending
- Stop Loss order support

### December 2021
- Improved orderbook output
- Removed POST method for orderbook
- Final notice for legacy APIs

## Other API Changes

### December 2022
- Added ability to register and receive favorite markets list
- Added symbol search on UDF chart
- Added filter for order list by source ID

### November 2022
- Added Jubi wallet deposit fee to settings endpoint response

### October 2022
- Added ability to register and receive anti-phishing code

### October 2024
- Removed availableBalance parameter from /liquidity-pools/list endpoint response
