# Coding Rules

This repository enforces strict TypeScript and code-quality rules.

## 1. Type Safety
- **No `any` types**: You must explicitly define interfaces or types for all variables, function parameters, and return signatures. The linter is configured to throw errors if implicit `any` is detected.
- **Interfaces**: Validation schemas should be written using `zod`, and TypeScript types should be inferred from those schemas (`z.infer<typeof Schema>`).

## 2. Asynchronous Logic
- Never use `.then()/.catch()`. You must strictly use `async/await`.
- Wrap all controllers in the `asyncHandler` wrapper.
- Do not place `try/catch` blocks inside controllers unless you are doing highly specific error parsing. Rely on `asyncHandler`.

## 3. Database Transactions
If your Service function creates, updates, or deletes documents across multiple tables, you MUST wrap the operations in a Prisma transaction.

Example:
```typescript
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { ... } });
  const profile = await tx.profile.create({ data: { userId: user.id, ... } });
  return { user, profile };
});
```

## 4. Error Handling
- Use the predefined error handler utility (`AppError` or standard Express error handling) to pass errors to the global error middleware.
