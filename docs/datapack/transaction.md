# Transaction

## POST /transaction/create

### body

```json
{
  // job id
  "job": "",
  "job_token": "",
  "world_token": "",
  // mc user uuid
  "user": ""
}
```

### response

```json
{
  "success": "true",
  "id": 1
}
```

## GET /transaction/poll/:id

### params

id

### query string params

job (job id), job_token, world_token

### response

```json
{
  "success": true,
  "status": "approved/rejected/waiting"
}
```

### example URL

`http://wwlc.legiti.dev/api/transaction/poll/1?job=wwlc-1&job_token=dacca3c6ea99b64869f006e63fdc399594d3fceca19148286ca87dfa1abb014b&world_token=796d694d260c7c952b0ac7561d296b5ede150572e99689a5d47cbf669e9fdd2b`
