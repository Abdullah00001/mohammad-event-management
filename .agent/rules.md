# Mohammad Event Management - AI Agent Guidelines

> **CRITICAL INSTRUCTIONS FOR ANY AI AGENT WORKING ON THIS REPOSITORY**
> Read this document completely before modifying any files, creating new modules, or running scripts. Failure to adhere to these rules will result in structural inconsistencies.

---

## 1. Project Architecture & Philosophy
This repository is a Docker-centric monorepo consisting of:
- `server`: The main REST API service (Node.js/Express) and WebSockets (Socket.IO).
- `worker`: Background task processor (BullMQ).
- `corn`: Scheduled cron jobs (Node-Cron).
- `prisma`: The absolute source-of-truth for the Postgres database schema and TypeScript definitions.

**Rule**: Do not start Postgres, Redis, or the Node processes manually on the host. Always use `docker compose`.

---

## 2. Module Creation (STRICT WORKFLOW)
Do NOT manually create module files or folders using `touch` or `mkdir`. You must use the built-in CLI scripts to scaffold modules. This ensures the required standard structure (`controllers`, `services`, `helpers`, `middlewares`, `routes`, `schemas`, `dto`, `types`) is perfectly maintained.

**To create a new Server Module:**
1. Do not manually `mkdir` or `touch` files.
2. Run the script inside the server container:
   `docker compose exec server npm run create:module <module_name>`
3. This will scaffold all required `.ts` files inside `server/src/app/modules/<module_name>`.

---

## 3. Database Operations
- The database is **PostgreSQL**, managed by **Prisma**.
- Do not use Mongoose or MongoDB instructions.
- All schema changes must be done in `prisma/schema.prisma`.
- After changing the schema, you must run `npx prisma generate` and `npx prisma db push` (or `migrate dev`) as appropriate.

---

## 4. Required Documentation
Always read the existing documentation before proposing architecture changes:
- `docs/README.md` (Repository Index)
- `server/README.md` (API Service Rules)
