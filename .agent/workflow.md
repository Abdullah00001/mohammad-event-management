# Development Workflow

> **STRICT RULE**: Do NOT manually create files or folders for modules using `touch` or `mkdir`. You MUST use the CLI scripts below to maintain codebase consistency.

## 1. Creating a New Backend Module

Whenever you need to create a new API feature, follow this exact process:

1. **Scaffold the API Module**:
   Run the following command inside the server container to automatically generate the required 8-file structure:
   ```bash
   docker compose exec server npm run create:module <module_name>
   ```
   *(This creates `controllers`, `services`, `helpers`, `middlewares`, `routes`, `schemas`, `dto`, and `types` inside `server/src/app/modules/<module_name>`)*.

2. **Populate the Files**:
   Implement the logic in the generated files:
   - `schemas`: Define Zod validation schemas.
   - `routes`: Mount the endpoints.
   - `controllers`: Handle req/res and pass data to services.
   - `services`: Business logic and database queries using Prisma.

## 2. General Docker Workflow

- To view server logs: `docker compose logs -f server`
- To run linting: `docker compose exec server npm run lint`
- To format code: `docker compose exec server npm run format`
