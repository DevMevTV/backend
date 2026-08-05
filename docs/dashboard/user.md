# User

## GET /user/:uuid

### headers

user authorization header (optional)

### params

uuid

### unauthorized response

```json
{
  "success": "true",
  "uuid": "",
  "name": "",
  "balance": 0,
  "admin": false
}
```

### authorized response

```json
{
  "success": true,
  "uuid": "",
  "name": "",
  "balance": 0,
  "admin": false,
  "worlds": [
    {
      "uuid": "",
      "name": "",
      "verified": true,
      "balance": 0
    }
  ],
  "transactions": [
    {
      "id": 1,
      "job": "",
      "fromType": "world/user",
      "fromId": "",
      "toType": "world/user",
      "toId": "",
      "status": "approved/rejected/waiting",
      "amount": 1,
      "time": "2026-08-05T14:39:16.122Z"
    }
  ]
}
```

## POST /user/login

### body

```json
{
  "client_id": "",
  "client_secret": "",
  "code": "",
  "redirect_uri": "",
  "grant_type": "authorization_code"
}
```

### response

```json
{
  "success": true,
  "token": "",
  "uuid": "",
  "state": ""
}
```
