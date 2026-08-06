# Naming Conventions

Strict adherence to naming conventions ensures the codebase remains readable and predictable.

## 1. File Naming
- All module folders must be lowercase and continuous (`productcategory`, not `productCategory` or `product-category`).
- Files inside the module must follow the dot-notation standard: `<module>.<type>.ts`.
  - Example: `auth.controllers.ts`, `auth.services.ts`, `auth.middlewares.ts`.

## 2. Variable & Function Naming
- Use `camelCase` for all variables, constants, and function names.
  - Example: `createProductController`, `getUserByIdService`.
- Controllers must end in `Controller` or `Controllers`.
- Services must end in `Service` or `Services`.

## 3. Class & Interface Naming
- Use `PascalCase` for all TypeScript Classes and Interfaces.
- Interfaces representing Mongoose schemas should be prefixed with `I`.
  - Example: `IUser`, `IBusinessProfile`.

## 4. Environment Variables
- Use `UPPER_SNAKE_CASE` for all environment variables defined in `.env`.
  - Example: `MONGODB_URI`, `JWT_ACCESS_SECRET`.
