#!/bin/bash

set -e

echo "🚀 Running Prisma migrations and generation..."

echo ""
echo "▶ [server] prisma migrate dev"
docker compose exec -T server npx prisma migrate dev

echo ""
echo "▶ [server] prisma generate"
docker compose exec -T server npx prisma generate

echo ""
echo "▶ [worker] prisma migrate dev"
docker compose exec -T worker npx prisma migrate dev

echo ""
echo "▶ [worker] prisma generate"
docker compose exec -T worker npx prisma generate

echo ""
echo "✅ Done!"