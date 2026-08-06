#!/bin/bash

set -e

echo "🚀 Running Prisma migrations and generation..."

if [ "$CI" = "true" ]; then
    echo "▶ [server] prisma migrate deploy (CI Mode)"
    docker compose exec -T server npx prisma migrate deploy
else
    echo "▶ [server] prisma migrate dev"
    # Remove -T to allow interactive prompts for migration names
    docker compose exec server npx prisma migrate dev
fi

echo ""
echo "▶ [server] prisma generate"
docker compose exec -T server npx prisma generate

echo ""
echo "▶ [worker] prisma generate"
docker compose exec -T worker npx prisma generate

echo ""
echo "▶ [corn] prisma generate"
docker compose exec -T corn npx prisma generate

echo ""
echo "✅ Done!"