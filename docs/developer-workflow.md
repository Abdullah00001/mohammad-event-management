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

### Step 2: Install dependencies and generate Prisma

```bash
npm install
npm run sync:prisma
```

This ensures:

- root dependencies are installed
- server dependencies are installed
- worker dependencies are installed
- Prisma clients are generated from the shared schema

### Step 3: Verify Prisma client generation

```bash
ls node_modules/.prisma/client
ls server/node_modules/.prisma/client
ls worker/node_modules/.prisma/client
```

### Step 4: Start the Docker development environment

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

## Returning developer flow

### Step 1: Pull latest changes

```bash
git pull
```

### Step 2: Update dependencies if needed

```bash
npm install
```

### Step 3: Regenerate Prisma clients after schema or dependency changes

```bash
npm run generate
```

### Step 4: Restart Docker

```bash
docker compose down
docker compose up -d --build
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

1. Update the schema.
2. Apply a migration:

```bash
cd /home/abdullah/Projects/mohammad-event-management
npx dotenv -e server/.env -- npx prisma migrate dev --schema prisma/schema.prisma --name <describe_change>
```

3. Regenerate Prisma clients:

```bash
npm run generate
```

4. Rebuild and restart Docker:

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
- Keep `prisma/schema.prisma` and `prisma.config.ts` as the shared source of truth.
- Do not add separate Prisma config files in `server/` or `worker/`.
- If VS Code does not autocomplete Prisma, regenerate clients and restart the editor.
