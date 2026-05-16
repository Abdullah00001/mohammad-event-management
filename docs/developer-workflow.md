# Developer Workflow

This repo is designed for Docker-native development and production.
Both `server/` and `worker/` run inside containers, using the same shared root Prisma schema.

## Project structure

- `prisma/` — shared schema and generated Prisma clients
- `prisma.config.ts` — shared Prisma config
- `server/` — server service source code and dev Dockerfile
- `worker/` — worker service source code and dev Dockerfile
- `scripts/sync_prisma.sh` — helper for install and Prisma generation
- `package.json` — root helper scripts

## Philosophy

- Development and production both use Docker for consistent environments.
- No native `npm run dev` workflow is expected on developer machines.
- Docker files `server/Dockerfile.dev` and `worker/Dockerfile` are used for the development environment.
- `prisma/schema.prisma` and `prisma.config.ts` are shared across both services.

## What is automated

- `npm run generate` generates Prisma clients for:
  - `node_modules/.prisma/client`
  - `server/node_modules/.prisma/client`
  - `worker/node_modules/.prisma/client`
- `npm run generate:all` is an alias for `npm run generate`.
- `npm run sync:prisma` installs dependencies and regenerates Prisma clients.
- The Docker setup mounts the shared root `prisma/` and `prisma.config.ts` into both services.

## New developer flow (first-time clone)

### Step 1: Clone the repository

```bash
git clone <repo-url>
cd mohammad-event-management
```

### Step 2: Install dependencies

```bash
npm install
```

This ensures:

- root dependencies are installed
- server dependencies are installed
- worker dependencies are installed

### Step 3: Start Docker Compose before Prisma schema or migration work

```bash
docker compose down
docker compose up -d --build
```

This starts the required database and cache services before any Prisma migration or schema change.

### Step 4: Generate Prisma clients

```bash
npm run sync:prisma
```

This ensures:

- Prisma clients are generated from the shared schema
- local code and containers use the same Prisma client

### Step 5: Verify Prisma client generation

```bash
ls node_modules/.prisma/client
ls server/node_modules/.prisma/client
ls worker/node_modules/.prisma/client
```

## Returning developer flow

### Step 1: Pull latest changes

```bash
git pull
```

### Step 2: Update dependencies if needed

```bash
npm install
```

### Step 3: Start Docker Compose before Prisma work

```bash
docker compose down
docker compose up -d --build
```

### Step 4: Regenerate Prisma clients after schema or dependency changes

```bash
npm run generate
```

## Before running Docker Compose

Confirm the following:

1. Root dependencies are installed.
2. Prisma clients are generated.
3. `server/.env` and `worker/.env` exist and are configured.
4. `prisma/schema.prisma` and `prisma.config.ts` are up-to-date.

Then run:

```bash
docker compose down
docker compose up -d --build
```

## Prisma schema change workflow

### When `prisma/schema.prisma` changes

> WARNING: Do not modify `prisma/schema.prisma` unless Docker Compose is running and Postgres is healthy.

1. Start Docker Compose if it is not already running:

```bash
docker compose down
docker compose up -d --build
```

2. Update the schema.
3. Apply a migration:

```bash
cd /home/abdullah/Projects/mohammad-event-management
npx dotenv -e server/.env -- npx prisma migrate dev --schema prisma/schema.prisma --name <describe_change>
```

4. Regenerate Prisma clients:

```bash
npm run generate
```

5. Rebuild and restart Docker if needed:

```bash
docker compose down
docker compose up -d --build
```

## Checklists

### New developer checklist

- [ ] Repository cloned
- [ ] `npm install` run
- [ ] `npm run sync:prisma` run
- [ ] Prisma clients exist in root, `server`, and `worker`
- [ ] `server/.env` and `worker/.env` exist
- [ ] `prisma/schema.prisma` and `prisma.config.ts` are current
- [ ] Docker environment starts successfully

### Returning developer checklist

- [ ] Latest branch pulled
- [ ] `npm install` run if dependencies changed
- [ ] `npm run generate` run after schema changes
- [ ] Docker restarted after schema changes

## Common commands

### Root commands

```bash
npm install
npm run generate
npm run generate:all
npm run sync:prisma
```

### Docker commands

```bash
docker compose down
docker compose up -d --build
```

### Prisma migration command

```bash
cd /home/abdullah/Projects/mohammad-event-management
npx dotenv -e server/.env -- npx prisma migrate dev --schema prisma/schema.prisma --name <describe_change>
```

## Important notes

- Development is Docker-native; do not use local `npm run dev` workflows.
- Start Docker Compose before running any Prisma migration or schema generation commands.
- Do not modify `prisma/schema.prisma` unless the database is running via Docker Compose.
- Keep `prisma/schema.prisma` and `prisma.config.ts` as the shared source of truth.
- Do not add separate Prisma config files in `server/` or `worker/`.
- If VS Code does not autocomplete Prisma, regenerate clients and restart the editor.
