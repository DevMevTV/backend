# Job

## POST /job/create

### headers

user authorization header

### body

#### type

sell - user sends WLC to world. reward handled by world

buy - payout WLC from world account to user

```json
{
  "id": "",
  "name": "",
  "type": "buy/sell",
  "amount": 1,
  "world_token": ""
}
```

### response

```json
{
  "success": true,
  "token": ""
}
```

## PATCH /job/update

### headers

user authorization header

### body

```json
{
  "id": "",
  "amount": 1,
  "world_token": ""
}
```

### response

```json
{
  "success": true,
  "token": ""
}
```
