# API Guidelines

## 1. Request Validation
- Use **Zod** for all request body, query, and params validation.
- Schemas should be defined in `src/app/modules/<module_name>/<module_name>.schemas.ts`.
- Use the provided validation middleware (e.g. `validateReqBody`, `validateReqQuery`) in the routes file.

## 2. Response Structure
- All API responses must follow a consistent JSON format:
```json
{
  "success": true,
  "status": 200,
  "message": "Operation successful",
  "data": { ... }
}
```
- In case of an error, the response should look like:
```json
{
  "success": false,
  "status": 400,
  "message": "Error description here",
  "errorType": "VALIDATION_ERROR"
}
```

## 3. Status Codes
- `200 OK`: Successful read or update.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or bad input.
- `401 Unauthorized`: Missing or invalid authentication.
- `403 Forbidden`: Authenticated, but lacks required permissions.
- `404 Not Found`: Resource does not exist.
- `500 Internal Server Error`: Unhandled server exception.
