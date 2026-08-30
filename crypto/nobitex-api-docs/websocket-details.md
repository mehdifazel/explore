# Nobitex WebSocket Details

## Connection

```
wss://ws.nobitex.ir/connection/websocket
```

- Maximum 100 concurrent connections per IP
- Response to ping within 25 seconds is required

## SDKs

- centrifuge-js (browser, NodeJS, ReactNative)
- centrifuge-python
- centrifuge-go
- centrifuge-java
- centrifuge-swift
- centrifuge-dart

## Connection Message (without SDK)

```json
{"connect": {}, "id": 1}
```

With token: `{"connect": {"token": "<TOKEN>"}, "id": 1}`

## Orderbook Channel

```
public:orderbook-BTCIRT
```

With delta: `{ delta: 'fossil' }` to reduce bandwidth

Response:
```json
{
  "asks": [["price", "amount"], ...],
  "bids": [["price", "amount"], ...],
  "lastTradePrice": "...",
  "lastUpdate": timestamp
}
```

## Candlestick Channel

```
public:candle-BTCIRT-15
```

resolution: 1, 5, 15, 30, 60, 180, 240, 360, 720, D, 2D, 3D

Response:
```json
{
  "t": unix_time,
  "o": open, "h": high, "l": low, "c": close,
  "v": volume
}
```

## Public Trades Channel

```
public:trades-BTCIRT
```

Response: price, time, type (buy/sell), volume

## Market Stats Channel

```
public:market-stats-BTCIRT
public:market-stats-all
```

## Private Channels

Require token from GET /auth/ws/token/
- `private:orders#{websocketAuthParam}`
- `private:trades#{websocketAuthParam}`

websocketAuthParam from user profile

## Maximum Subscriptions

300 channels per connection
