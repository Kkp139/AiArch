const fs = require('fs');
const path = require('path');

// Ensure build output exists in both ./dist and apps/web/dist
// This guarantees Vercel succeeds whether it runs from repository root or apps/web
const rootDir = path.resolve(__dirname, '..');
const webDist = path.join(rootDir, 'apps', 'web', 'dist');
const rootDist = path.join(rootDir, 'dist');

if (fs.existsSync(webDist)) {
  fs.cpSync(webDist, rootDist, { recursive: true, force: true });
  console.log(`[sync-dist] Synced ${webDist} -> ${rootDist}`);
} else if (fs.existsSync(rootDist)) {
  fs.cpSync(rootDist, webDist, { recursive: true, force: true });
  console.log(`[sync-dist] Synced ${rootDist} -> ${webDist}`);
}
