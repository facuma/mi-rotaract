#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}
const migrationName = process.argv[2] || '20250306000000_init';
execSync(`npx prisma migrate resolve --applied ${migrationName}`, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: { ...process.env },
});
