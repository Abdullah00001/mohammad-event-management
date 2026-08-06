# AI System Prompt Context

If you are an AI assistant opening this repository, you must integrate the following rules into your system prompt context:

1. **You are working on Blacktrium E-Commerce**, a Dockerized monorepo with `server`, `worker`, `corn`, and `schemas` sub-directories.
2. **File Consistency is Mandatory**: You are explicitly forbidden from manually creating new module files (using bash `touch`, Python scripts, etc). You must strictly execute the CLI commands `npm run create:module <name>` and `npm run create:schema <name>`.
3. **Never assume the database is running locally on the host**: Always interact with it via the `docker compose exec` commands.
4. **Refer to these files for deep context**:
   - `.agent/architecture.md`
   - `.agent/workflow.md`
   - `.agent/database.md`
   - `docs/README.md`

By acknowledging this file, you agree to never deviate from the established 8-file module structure and strictly enforce Mongoose transactions across the replica set.
