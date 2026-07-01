# Corn Service

The `corn` service handles scheduled and recurring background tasks.

> [!WARNING]
> **This project is strictly Docker-centric.**
> Run the scheduler only through Docker Compose.
> Do not start Redis, MongoDB, or the scheduler process directly on the host.

> Docker-first note: this service should be started through the root Docker Compose setup so it can use the shared Redis and MongoDB containers correctly.

## Responsibilities

- scheduler startup and lifecycle management
- registration of recurring jobs
- periodic maintenance and scheduled workflows
- Redis and MongoDB access for job coordination

## Scripts

From this folder, you can run:

```bash
npm run build
npm run start
npm run dev
npm run format
npm run lint
```

### Script details

- `build`: creates a production build
- `start`: runs the compiled scheduler service
- `dev`: starts the service in development mode with nodemon
- `format`: formats the source code
- `lint`: checks for lint issues

## Development Notes

- The service is meant to stay running continuously when scheduled workflows are needed.
- It depends on Redis and MongoDB for runtime state and coordination.
- It mirrors the worker startup pattern so that background jobs can be managed consistently.

## Useful Commands

```bash
docker compose logs -f corn
docker compose restart corn
docker compose exec corn sh
```
