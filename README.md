# Mohammad Event Management

This repository is a full-stack event management system with two separate Node.js/TypeScript services:

- `server/` — web API and Socket.IO service
- `worker/` — background BullMQ worker for email and system jobs

Both services share a single root Prisma schema in `prisma/schema.prisma`.

## Key concepts

- Shared database schema:
  - `prisma/schema.prisma`
  - `prisma.config.ts`
- Root Prisma client generation writes clients into:
  - `node_modules/.prisma/client`
  - `server/node_modules/.prisma/client`
  - `worker/node_modules/.prisma/client`
- Shared workflow is automated via root scripts and `scripts/sync_prisma.sh`

## Quick start

### 1. Install dependencies

```bash
cd /home/abdullah/Projects/mohammad-event-management
npm install
```

### 2. Generate Prisma clients

```bash
npm run generate
```

### 3. Start local services

In one terminal:

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd worker
npm run dev
```

## Docker development

Before running Docker, ensure the shared schema and generated clients are up-to-date.

```bash
docker compose down
docker compose up -d --build
```

## Useful scripts

- `npm run generate` — generate Prisma clients from shared root schema
- `npm run generate:all` — alias for `npm run generate`
- `npm run sync:prisma` — install dependencies and regenerate Prisma clients

## Developer documentation

See `docs/developer-workflow.md` for full setup, workflows, schema migration steps, and checklists for new and returning developers.

## Notes

- Do not add separate Prisma config files under `server/` or `worker/`.
- Always use the shared root schema and root Prisma config.
- Local VS Code Prisma support depends on generated clients existing in the root, `server`, and `worker` directories.
