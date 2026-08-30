# Deprecated Nobitex API Endpoints

**Source:** https://apidocs.nobitex.ir/deprecated/

Some APIs are considered deprecated due to structural or functional changes and should no longer be used.

## Default Referral Code

```
GET /users/get-referral-code
```

```bash
curl 'https://apiv2.nobitex.ir/users/get-referral-code' \
  -H "Authorization: Token yourTOKENhereHEX0000000000"
```

Sample response:
```json
{
  "status": "ok",
  "referredUsersCount": 0,
  "referralCode": "84440",
  "referralFeeTotalCount": 0,
  "referralFeeTotal": 0
}
```

⚠️ **Note:** Use the new API endpoints `/users/referral/links-list` and `/users/referral/links-add` instead.
