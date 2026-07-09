# System Architecture

## Core Tech Stack
- **API Server**: Node.js + Express
- **Language**: TypeScript
- **Database**: PostgreSQL (managed by Prisma ORM)
- **Background Jobs**: BullMQ
- **Scheduled Tasks**: Node-Cron
- **Real-time Engine**: Socket.IO
- **Cache / Message Queue**: Redis

## Services Structure
This is a standard multi-service containerized architecture.
- `server`: The public-facing REST API and WebSocket server.
- `worker`: The BullMQ worker service that processes background jobs (e.g., sending emails).
- `corn`: The cron scheduler service that fires off scheduled tasks.
- `postgres`: The primary relational database.
- `redis`: The in-memory cache and queue storage.

## Communication
- API requests hit the `server` container.
- Socket.IO connections hit the `server` container.
- `server` pushes jobs to Redis for `worker` to pick up.
- `corn` schedules events and runs routines periodically.
