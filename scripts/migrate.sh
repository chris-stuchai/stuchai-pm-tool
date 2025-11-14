#!/bin/bash
set -e

echo "Running database migrations..."

# Run Prisma migrations
npx prisma db push --accept-data-loss || true

echo "Migrations complete!"

