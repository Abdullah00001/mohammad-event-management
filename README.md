# Mohammad Event Management

This repository is built for Docker-native development and production.
Both `server/` and `worker/` run inside containers, sharing a single root Prisma schema.

## Key concepts

- Shared database schema:
  - `prisma/schema.prisma`
  - `prisma.config.ts`
- Root Prisma client generation writes clients into:
  - `node_modules/.prisma/client`
  - `server/node_modules/.prisma/client`
  - `worker/node_modules/.prisma/client`
- Docker-native workflow is automated via root scripts and `scripts/sync_prisma.sh`

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

### 3. Start the Docker development environment

```bash
docker compose down
docker compose up -d --build
```

This starts:

- Postgres
- Redis
- Redis UI
- worker service
- server service

## Useful scripts

- `npm run generate` — generate Prisma clients from the shared root schema
- `npm run generate:all` — alias for `npm run generate`
- `npm run sync:prisma` — install dependencies and regenerate Prisma clients

## Developer documentation

See `docs/developer-workflow.md` for the complete Docker-native setup, workflow, schema migration steps, and checklists.

## Notes

- Development is Docker-native; do not rely on local `npm run dev` workflows.
- Do not add separate Prisma config files under `server/` or `worker/`.
- Use the shared root Prisma schema and config only.
- If VS Code does not autocomplete Prisma, regenerate clients and restart the editor.
