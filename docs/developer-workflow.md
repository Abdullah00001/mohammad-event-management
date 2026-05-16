# Developer Workflow

This repository uses a shared root Prisma schema for two services:

- `server/` — the API + socket service
- `worker/` — the background queue worker

Both services share the same schema in `prisma/schema.prisma` and the same root Prisma configuration in `prisma.config.ts`.

## Project structure

- `prisma/` — shared schema and generated Prisma clients
- `prisma.config.ts` — shared Prisma config
- `server/` — server service source code
- `worker/` — worker service source code
- `scripts/sync_prisma.sh` — helper for install and Prisma generation
- `package.json` — root helper scripts

## What is automated now

- Root `npm run generate` generates Prisma clients for:
  - `node_modules/.prisma/client`
  - `server/node_modules/.prisma/client`
  - `worker/node_modules/.prisma/client`
- `npm run generate:all` is an alias for `npm run generate`.
- `npm run sync:prisma` installs the repo root and service dependencies, then regenerates Prisma clients.
- `server/dev` and `worker/dev` both generate Prisma from the shared root config before launch.
- `server/postinstall` and `worker/postinstall` also generate Prisma from the shared root config.

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

This makes sure:

- root dependencies are installed
- server dependencies are installed
- worker dependencies are installed
- Prisma clients are generated from the shared schema

### Step 3: Verify generated Prisma clients

```bash
ls node_modules/.prisma/client
ls server/node_modules/.prisma/client
ls worker/node_modules/.prisma/client
```

### Step 4: Start local development

Open one terminal for the server and one terminal for the worker.

Server:

```bash
cd server
npm run dev
```

Worker:

```bash
cd worker
npm run dev
```

## Existing developer flow (returning to the project)

### Step 1: Pull latest changes

```bash
git pull
```

### Step 2: Update dependencies if needed

```bash
npm install
```

### Step 3: Regenerate Prisma after schema or dependency changes

```bash
npm run generate
```

### Step 4: Restart local services

```bash
cd server && npm run dev
```

and

```bash
cd worker && npm run dev
```

## Before running Docker Compose

Always do this first:

1. Confirm root dependencies are installed.
2. Confirm Prisma clients are generated.
3. Confirm `server/.env` and `worker/.env` exist and are correct.
4. Confirm `prisma/schema.prisma` and `prisma.config.ts` are current.

Then run:

```bash
docker compose down
docker compose up -d --build
```

## Prisma schema change workflow

### When you update `prisma/schema.prisma`

1. Modify the schema.
2. Apply a migration locally:

```bash
cd /home/abdullah/Projects/mohammad-event-management
npx dotenv -e server/.env -- npx prisma migrate dev --schema prisma/schema.prisma --name <describe_change>
```

3. Regenerate Prisma clients:

```bash
npm run generate
```

4. Restart local services:

```bash
cd server && npm run dev
cd worker && npm run dev
```

### If you are using Docker after a schema change

Rebuild and restart containers:

```bash
docker compose down
docker compose up -d --build
```

## Checklist before you start working

### New developer checklist

- [ ] Repository cloned
- [ ] Root `npm install` complete
- [ ] `npm run sync:prisma` executed
- [ ] Prisma clients exist in root, server, and worker
- [ ] `server/.env` and `worker/.env` are present
- [ ] `prisma/schema.prisma` and `prisma.config.ts` are current
- [ ] Docker preflight check completed if using containers

### Returning developer checklist

- [ ] Latest branch pulled
- [ ] `npm install` run if dependencies changed
- [ ] `npm run generate` run after schema changes
- [ ] Local services restarted after migrations
- [ ] Docker containers rebuilt if running containerized development

## Common commands

### Root commands

```bash
npm install
npm run generate
npm run generate:all
npm run sync:prisma
```

### Service commands

Server:

```bash
cd server
npm run dev
```

Worker:

```bash
cd worker
npm run dev
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

- Keep the shared root schema at `prisma/schema.prisma`.
- Keep the shared root config at `prisma.config.ts`.
- Do not create separate Prisma config files in `server/` or `worker/`.
- Use `server/.env` for local Prisma commands because it contains `DATABASE_URL`.
- If VS Code does not show Prisma autocomplete, regenerate clients and restart the editor.
