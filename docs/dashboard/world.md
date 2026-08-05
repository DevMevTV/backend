# World

## POST /world/create

### headers

user authorization header

### body

```json
{
  "uuid": "",
  "name": ""
}
```

### response

```json
{
  "success": true,
  "token": ""
}
```

## POST /world/verify/:uuid

Marks world as verified. admin only

### headers

user authorization header

### params

uuid

### response

```json
{
  "success": true,
  "uuid": ""
}
```

## GET /world/:uuid

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
  "balance": 0
}
```

### authorized response

```json
{
  "success": true,
  "uuid": "",
  "name": "",
  "verified": false,
  "balance": 0,
  "token": "",
  "jobs": [
    {
      "id": 1,
      "name": "",
      "token": "",
      "type": "buy/sell"
      "amount": 1
    }
  ]
}
```
