/**
 * Custom Vercel build script for NestJS monorepo.
 * Produces .vercel/output following the Build Output API v3.
 *
 * Run:  node scripts/vercel-build.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_DIR = __dirname.replace(/[\\/]scripts$/, '');
const ROOT_DIR = path.resolve(API_DIR, '../..');
const OUT = path.join(API_DIR, '.vercel', 'output');
const FUNC = path.join(OUT, 'functions', 'index.func');

// ── helpers ────────────────────────────────────────────────────────
function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  execSync(`xcopy "${src}" "${dest}" /E /I /Q /Y /H`, { stdio: 'ignore' });
}

// ── main ───────────────────────────────────────────────────────────
console.log('🔨 Building NestJS API for Vercel…');

// 1. Ensure dist exists
if (!fs.existsSync(path.join(API_DIR, 'dist'))) {
  console.log('  → Running nest build…');
  execSync('pnpm --filter api run build', { cwd: ROOT_DIR, stdio: 'inherit' });
}

// 2. Clean previous output
rimraf(OUT);
mkdirp(FUNC);

// 3. Copy dist
console.log('  → Copying dist/');
copyDir(path.join(API_DIR, 'dist'), path.join(FUNC, 'dist'));

// 4. Copy the serverless entry point
console.log('  → Copying index.js');
fs.copyFileSync(
  path.join(API_DIR, 'index.js'),
  path.join(FUNC, 'index.js'),
);

// 5. Copy node_modules from monorepo root (hoisted by pnpm)
console.log('  → Copying node_modules (this may take a moment)…');
copyDir(
  path.join(ROOT_DIR, 'node_modules'),
  path.join(FUNC, 'node_modules'),
);

// 6. Create the .vc-config.json for the function
fs.writeFileSync(
  path.join(FUNC, '.vc-config.json'),
  JSON.stringify({
    runtime: 'nodejs20.x',
    handler: 'index.js',
    launcherType: 'Nodejs',
    maxDuration: 30,
  }),
);

// 7. Create the top-level config.json
fs.writeFileSync(
  path.join(OUT, 'config.json'),
  JSON.stringify({
    version: 3,
    routes: [{ src: '/(.*)', dest: '/index' }],
  }),
);

console.log('✅ Build output ready at .vercel/output');
console.log('   Run: vercel deploy --prebuilt --prod');
