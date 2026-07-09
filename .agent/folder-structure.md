# Project Folder Structure

This is a monorepo consisting of multiple independent services.

## Root Directories

- `/server`: The core Node.js/Express API.
- `/worker`: The BullMQ background processor (handles emails, push notifications, etc.).
- `/corn`: The cron scheduler service.
- `/prisma`: The single source of truth for the Postgres database schema and Prisma Client configuration.
- `/docs`: Markdown documentation and Postman collections for human developers.

## Server Directory Map (`/server/src/app`)

- `/modules`: Contains the business logic, heavily compartmentalized into standard module structures (`controllers`, `services`, `routes`, etc.).
- `/configs`: Global configuration files (Database, Redis, Logger, S3).
- `/middlewares`: Global middlewares (Error handling, Token validation, Multer).
- `/utils`: Helper functions (`system.utils`, JWT tools, etc.).
- `/routes`: The master V1 router that aggregates all module routes.
- `/sockets`: WebSocket configurations, handlers, and events using Socket.IO.
