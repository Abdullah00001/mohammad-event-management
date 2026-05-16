#!/bin/bash

set -e

echo "🚀 Running Prisma migrations and generation..."

echo ""
echo "▶ [server] prisma migrate dev"
docker compose exec server npx prisma migrate dev

echo ""
echo "▶ [server] prisma generate"
docker compose exec server npx prisma generate

echo ""
echo "▶ [worker] prisma migrate dev"
docker compose exec worker npx prisma migrate dev

echo ""
echo "▶ [worker] prisma generate"
docker compose exec worker npx prisma generate

echo ""
echo "✅ Done!"