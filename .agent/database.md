# Database Guidelines

This project uses **PostgreSQL** as the relational database, managed entirely via **Prisma**.

## 1. Schema Management
- The single source of truth for the database schema is `prisma/schema.prisma`.
- Whenever you make changes to `schema.prisma`:
  1. Generate the Prisma client: `npx prisma generate`
  2. Push the schema to the database in development: `npx prisma db push` (or run migrations using `npx prisma migrate dev`).

## 2. Migrations
- Production deployments should use migrations rather than `db push`. Ensure you create migrations when changing the schema for production environments.

## 3. Connecting and Querying
- Always import the pre-configured Prisma client instance (usually from `src/app/configs/db.configs.ts` or similar).
- Do NOT instantiate a new `PrismaClient` in your modules; use the shared instance to avoid exceeding connection pools.
- Write queries securely; Prisma automatically prevents SQL injection for standard object queries.

## 4. Seeding
- Seed scripts (if any) should be run via the package.json scripts or `npx prisma db seed`.
- Do not run development seeders that inject mock users/passwords into a production environment.
