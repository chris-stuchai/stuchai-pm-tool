#!/usr/bin/env node
/**
 * Custom server script for Railway
 * Ensures PORT is properly read from environment
 */
const { spawn } = require('child_process');

const port = process.env.PORT || '3000';
const hostname = '0.0.0.0';

console.log(`Starting Next.js server on ${hostname}:${port}`);

const next = spawn('npx', ['next', 'start', '-H', hostname, '-p', port], {
  stdio: 'inherit',
  env: process.env,
});

next.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

next.on('exit', (code) => {
  process.exit(code || 0);
});

