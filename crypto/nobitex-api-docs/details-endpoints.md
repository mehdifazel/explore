# Nobitex API Endpoint Details

## Rate Limit

- Error 429: TooManyRequests
- Response includes: backOff (seconds), limit
- Repeated ignoring → 2-minute token block
- Shared order limit: 300 requests/10 minutes (spot + margin)

## Successful Responses

```json
{"status": "ok", ...}
```

## Failed Responses

```json
{
  "status": "failed",
  "code": "ErrorCode",
  "message": "Error description"
}
```

## HTTP Codes

| Code | Description |
|------|-------------|
| 200 | OK - status in response |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Unprocessable Content |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Pagination

- page: 1 to 100
- pageSize: 1 to 100
- Default: 50 per page

## Time Filter

- from: start date
- to: end date
- Format: 2022-05-12

## Monetary Values

- Send as string for higher precision
- IRT market price unit: Rial (not Toman)
- USDT market unit: USDT

## Two-Factor (2FA)

Header: `X-TOTP: 123456`

## Spot Order Error Codes

| Code | Description |
|------|-------------|
| InvalidOrderPrice | Price not set or invalid |
| BadPrice | Price outside 30% market range |
| PriceConditionFailed | Price condition not met |
| OverValueOrder | Insufficient balance |
| SmallOrder | Min value: 3M IRT, 11 USDT |
| DuplicateOrder | Duplicate order within 10 seconds |
| InvalidMarketPair | Invalid market |
| MarketClosed | Market closed |
| TradingUnavailable | Incomplete authentication |
| DuplicateClientOrderId | Duplicate clientOrderId |

## Amount and Price Precision

- amountPrecisions and pricePrecisions in v2/options
- Min order: minOrders in v2/options (IRT: 3000000, USDT: 11)

## Order Status

- Active: Active in market
- Done: Fully filled
- Inactive: Stop loss inactive
- Canceled: Canceled

## Crypto Withdrawal Status

New, Verified, Processing, Done, Canceled, ...

## IRT Withdrawal Status

New, Sent, Bank processing, Partially Done, Done, Failed, Rejected, Canceled

## Margin Position Status

- Open: Open
- Closed: Closed
- Liquidated: Liquidated
- Expired: Expired

## Testnet Environment

- Website: https://testnet.nobitex.ir
- API: https://testnetapiv2.nobitex.ir
