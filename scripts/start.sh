#!/bin/bash
set -e

echo "Starting application..."

# Run database migrations
echo "Running database migrations..."
npx prisma db push --accept-data-loss --skip-generate || {
  echo "Warning: Database push failed, continuing anyway..."
}

# Start Next.js
echo "Starting Next.js server..."
exec next start -H 0.0.0.0 -p ${PORT:-3000}

