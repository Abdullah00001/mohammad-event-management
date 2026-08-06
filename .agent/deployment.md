# Deployment & Infrastructure Rules

When this application is deployed to a live VPS (Virtual Private Server) or Cloud environment, specific rules apply.

## 1. Environment Secrets
- Never commit `.env` files.
- The DevOps engineer must manually inject the live `STRIPE_SECRET_KEY`, `REVENUECAT_API_KEY`, and Firebase Service Account JSON credentials into the `.env` configuration.

## 2. Infrastructure Setup
- The cluster runs entirely via `docker-compose`.
- MongoDB uses Replica Sets (`rs0`) in production. You must ensure `mongo-init` successfully initializes the replica set, or Mongoose transactions will crash the API.
- An Nginx reverse proxy should be placed in front of the `server` container (port `5000`) to handle SSL termination.

## 3. Production Seeding (CRITICAL)
**NEVER run `npm run seed:full` in a production environment.**
To prepare a fresh production database:
1. `npm run sync:schema`
2. `npm run seed:country`
3. `npm run seed:legal`
4. `npm run create:admin` (Interactive prompt to securely generate the Admin credentials).
