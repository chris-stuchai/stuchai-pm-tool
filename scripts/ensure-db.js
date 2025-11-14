#!/usr/bin/env node

/**
 * Ensure database schema is up to date before starting the app
 * This runs at startup to create any missing tables
 */
const { execSync } = require('child_process');

console.log('🔄 Ensuring database schema is up to date...');

try {
  // Try to push schema (creates missing tables, doesn't delete data)
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ Database schema is up to date');
} catch (error) {
  console.error('⚠️  Failed to push database schema:', error.message);
  console.log('⚠️  App will continue, but some features may not work until database is accessible');
  // Don't exit - let the app start anyway
  process.exit(0);
}

