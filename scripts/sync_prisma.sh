#!/usr/bin/env bash
set -euo pipefail

# Simple helper to install server/worker deps and generate Prisma clients
# Usage: ./scripts/sync_prisma.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[sync_prisma] ROOT_DIR=${ROOT_DIR}"

echo "[sync_prisma] Installing root dependencies..."
cd "$ROOT_DIR"
npm install

echo "[sync_prisma] Installing server dependencies..."
cd "$ROOT_DIR/server"
npm install

echo "[sync_prisma] Installing worker dependencies..."
cd "$ROOT_DIR/worker"
npm install

echo "[sync_prisma] Generating Prisma clients from root schema..."
cd "$ROOT_DIR"
npm run generate

echo "[sync_prisma] Done."
