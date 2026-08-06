# Authentication Flow

This project utilizes JWT-based authentication for stateless REST API security.

## 1. The Token Strategy
- **Access Tokens**: Short-lived. Passed in the `Authorization` header as a Bearer token.
- **Refresh Tokens**: Long-lived. Stored securely in HTTP-only cookies.

## 2. Middleware Protections
Any protected route must use the following middlewares in sequence:

1. `checkAccessToken`: Validates the JWT and injects `req.user`.
2. `checkAccountStatus`: Checks if the user is `active` or `blocked`.
3. `isAdmin` or `checkBusinessSubscription` (Context-dependent): Validates role-based access.

## 3. Roles
- `user`: Standard consumer account.
- `merchant`: An active `user` who also possesses a valid `BusinessProfile`.
- `admin`: Super administrators who have access to the dashboard.

## 4. Business Profiles
A user cannot function as a merchant until they purchase a subscription via RevenueCat. The API route for creating a `BusinessProfile` is locked behind middleware that strictly verifies an active `Subscription` exists for that user ID.
