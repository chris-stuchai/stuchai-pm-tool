#!/bin/sh
set -e

echo "=== Starting Stuchai PM Tool ==="
echo "PORT: ${PORT:-3000}"
echo "NODE_ENV: ${NODE_ENV:-production}"
echo "DATABASE_URL: ${DATABASE_URL:0:50}..."

# Ensure PORT is set
export PORT=${PORT:-3000}

# Start Next.js
echo "Starting Next.js server on 0.0.0.0:${PORT}..."
exec node_modules/.bin/next start -H 0.0.0.0 -p ${PORT}

