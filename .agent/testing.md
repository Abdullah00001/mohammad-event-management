# Testing Guidelines

We utilize Postman as the primary mechanism for API integration testing and endpoint validation.

## 1. Postman Collection
- The master Postman collection is located at `docs/BLACKTRIUM _ HIDGIBOD_v1_postman_collection.json`.
- Do not manually edit this JSON file. Instead, use the custom sync script to automatically parse all registered Express routes and append them to the collection:
  ```bash
  npm run generate:postman
  ```

## 2. Local Testing Environment
To effectively test the application logic (such as Merchant dashboards and User checkouts), you must seed the local database.
- Start the Docker cluster: `docker-compose up -d`
- Run the full seeder: `npm run seed:full --prefix server`

This script provides pre-verified test credentials:
- Consumer: `user1@example.com` / `Password123!`
- Merchant: `merchant@example.com` / `Password123!`

## 3. Logs & Debugging
- Check server errors via: `docker compose logs -f server`
- Check background jobs (like failed emails) via: `docker compose logs -f worker`
- Check scheduled chron jobs via: `docker compose logs -f corn`
