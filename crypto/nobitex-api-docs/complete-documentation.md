# Nobitex API Complete Documentation

This file contains all endpoints and details of the Nobitex API.

---

## Base URL

```
https://apiv2.nobitex.ir
```

## Authentication

```
Authorization: Token yourTOKENhereHEX0000000000
```

---

# Market Data (Public)

## Orderbook

- **GET** `/v3/orderbook/SYMBOL` - Single market orderbook
- **GET** `/v3/orderbook/all` - All markets orderbook
- Limit: 300 requests/minute
- Token required: No

## Depth Chart

- **GET** `/v2/depth/SYMBOL`
- Limit: 300 requests/minute

## Trades List

- **GET** `/v2/trades/SYMBOL`
- Limit: 60 requests/minute

## Market Stats

- **GET** `/market/stats?srcCurrency=btc&dstCurrency=rls`
- Limit: 20 requests/minute

## OHLC Stats

- **GET** `/market/udf/history?symbol=BTCIRT&resolution=D&from=&to=`
- resolution params: 1, 5, 15, 30, 60, 180, 240, 360, 720, D, 2D, 3D

---

# User Information

## Profile

- **GET** `/users/profile`

## Generate Blockchain Address

- **POST** `/users/wallets/generate-address`
- Params: currency, wallet, network

## Add Bank Card

- **POST** `/users/cards-add`
- Params: number, bank

## Add Bank Account

- **POST** `/users/accounts-add`
- Params: number, shaba, bank

## User Limits

- **GET** `/users/limitations`

## Wallets List

- **GET** `/users/wallets/list`
- **GET** `/v2/wallets?currencies=rls,btc`

## Balance

- **POST** `/users/wallets/balance`
- Param: currency

## Transactions

- **GET** `/users/wallets/transactions/list?wallet=ID`
- **GET** `/users/transactions-history?currency=`

## Deposits List

- **GET** `/users/wallets/deposits/list?wallet=`

## Favorite Markets

- **GET** `/users/markets/favorite`
- **POST** `/users/markets/favorite` - market: BTCIRT or BTCIRT,DOGEUSDT
- **DELETE** `/users/markets/favorite` - market: All or BTCIRT

---

# Spot Market Trading

## Place Order

- **POST** `/market/orders/add`
- Params: type, execution, srcCurrency, dstCurrency, amount, price, clientOrderId
- execution: market, limit, stop_market, stop_limit
- Shared limit: 300 requests/10 minutes

## Order Status

- **POST** `/market/orders/status`
- Params: id or clientOrderId

## Orders List

- **GET** `/market/orders/list?srcCurrency=&dstCurrency=&status=&details=`

## Update Order Status

- **POST** `/market/orders/update-status`
- Params: order, clientOrderId, status=canceled

## Bulk Cancel

- **POST** `/market/orders/cancel-old`
- Params: hours, execution, srcCurrency, dstCurrency

## User Trades List

- **GET** `/market/trades/list?srcCurrency=&dstCurrency=&fromId=`

---

# Margin (Futures) Trading

## Markets List

- **GET** `/margin/markets/list`

## Liquidity Pools

- **GET** `/liquidity-pools/list`

## Transfer to Margin Wallet

- **POST** `/wallets/transfer`
- Params: currency, amount, src (spot/margin), dst (spot/margin)

## Delegation Limit

- **GET** `/margin/delegation-limit?currency=btc`

## Place Margin Order

- **POST** `/margin/orders/add`
- Params: srcCurrency, dstCurrency, type, leverage, amount, price

## Positions List

- **GET** `/positions/list?srcCurrency=&dstCurrency=&status=`
- status: active or past

## Position Status

- **GET** `/positions/{id}/status`

## Close Position

- **POST** `/positions/{id}/close`
- Params: amount, price, execution

## Edit Collateral

- **POST** `/positions/{id}/edit-collateral`
- Param: collateral

---

# Crypto Withdrawal

## Submit Request

- **POST** `/users/wallets/withdraw`
- Params: wallet, amount, address, network, tag, invoice (for BTCLN)

## Confirm Withdrawal

- **POST** `/users/wallets/withdraw-confirm`
- Params: withdraw, otp

## Withdrawal Details

- **GET** `/withdraws/{id}`

---

# IRT Withdrawal

## Submit Request

- **POST** `/cobank/withdraw`
- Params: destinationBankAccountId, amount

## Cancel Request

- **POST** `/cobank/withdraw/{id}/cancel`

## IRT Withdrawal Details

- **GET** `/cobank/withdraw/{id}`

---

# Withdrawals List

- **GET** `/users/wallets/withdraws/list?wallet=`

---

# WebSocket

**URL:** `wss://ws.nobitex.ir/connection/websocket`

## Public Channels

- `public:orderbook-BTCIRT` - Orderbook
- `public:candle-BTCIRT-15` - OHLC candlestick
- `public:trades-BTCIRT` - Trades
- `public:market-stats-BTCIRT` - Market stats
- `public:market-stats-all` - All markets stats

## Private Channels (require token)

- `private:orders#{websocketAuthParam}`
- `private:trades#{websocketAuthParam}`

**Get WebSocket token:** GET `/auth/ws/token/`

---

# Address Book and Secure Withdrawal

## Addresses List

- **GET** `/address_book?network=`

## Add Address

- **POST** `/address_book`
- Params: title, network, address, tag, otpCode, tfaCode

## Delete Address

- **DELETE** `/address_book/{id}/delete`

## Enable Secure Withdrawal

- **POST** `/address_book/whitelist/activate`

## Disable Secure Withdrawal

- **POST** `/address_book/whitelist/deactivate`
- Params: otpCode, tfaCode

---

# Security

## Login History

- **GET** `/users/login-attempts`

## Emergency Cancel Activation

- **GET** `/security/emergency-cancel/activate`

## Anti-Phishing

- **POST** `/security/anti-phishing` - code, otpCode
- **GET** `/security/anti-phishing`

---

# Referral Program

## Referral Links List

- **GET** `/users/referral/links-list`

## Create Referral Link

- **POST** `/users/referral/links-add`
- Param: friendShare

## Referral Status

- **GET** `/users/referral/referral-status`

## Register Referrer

- **POST** `/users/referral/set-referrer`
- Param: referrerCode

---

# Authentication

## Login - Get Token

- **POST** `/auth/login/`
- Params: username, password, remember, captcha=api
- Headers: X-TOTP, User-Agent: TraderBot/XXXXX

## Logout

- **POST** `/auth/logout/`

---

# P&L (Portfolio)

- **POST** `/users/portfolio/last-week-daily-profit`
- **POST** `/users/portfolio/last-week-daily-total-profit`
- **POST** `/users/portfolio/last-month-total-profit`

---

# System Settings

- **GET** `/v2/options` - No token required

---

# API Key (Experimental)

## Create Key

- **POST** `/apikeys/create`
- Params: name, description, permissions (READ,TRADE,WITHDRAW), ipAddressesWhitelist, expirationDate

## Keys List

- **GET** `/apikeys/list`

## Delete Key

- **POST** `/apikeys/delete/{public_key}`

## Update Key

- **POST** `/apikeys/update/`

### Required Headers for API Key

- Nobitex-Key
- Nobitex-Signature: base64(Ed25519(timestamp + method + url + body))
- Nobitex-Timestamp: Unix UTC

---

# Market Symbols (examples)

BTCIRT, ETHIRT, USDTIRT, LTCIRT, XRPIRT, DOGEIRT, BTCUSDT, ETHUSDT, ...

# Currencies (examples)

rls, btc, eth, usdt, ltc, xrp, doge, ...

# Networks (examples)

FIAT_MONEY, BTC, BSC, ETH, BNB, TRX, ...
