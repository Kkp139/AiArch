const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'apps', 'web', 'public', 'assets', 'auth', 'asf_logo.svg');
const iconDir = path.join(rootDir, 'apps', 'web', 'public', 'assets', 'icons');
const publicDir = path.join(rootDir, 'apps', 'web', 'public');
const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

const svgContent = fs.readFileSync(svgPath, 'utf8');

function createHtml(paddingPercent) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0C0C0D;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, #1E232A 0%, #0C0C0D 100%);
    padding: ${paddingPercent}%;
  }
  svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 4px 14px rgba(191, 147, 90, 0.35));
  }
</style>
</head>
<body>
  <div class="icon-container">
    ${svgContent}
  </div>
</body>
</html>`;
}

const standardHtmlPath = path.join(iconDir, 'temp-standard.html');
const maskableHtmlPath = path.join(iconDir, 'temp-maskable.html');

fs.writeFileSync(standardHtmlPath, createHtml(16));
fs.writeFileSync(maskableHtmlPath, createHtml(25)); // 25% padding satisfies maskable safe-zone requirements

const targets = [
  { size: 192, html: standardHtmlPath, out: path.join(iconDir, 'icon-192.png') },
  { size: 512, html: standardHtmlPath, out: path.join(iconDir, 'icon-512.png') },
  { size: 192, html: maskableHtmlPath, out: path.join(iconDir, 'icon-192-maskable.png') },
  { size: 512, html: maskableHtmlPath, out: path.join(iconDir, 'icon-512-maskable.png') },
  { size: 180, html: standardHtmlPath, out: path.join(publicDir, 'apple-touch-icon.png') },
  { size: 180, html: standardHtmlPath, out: path.join(iconDir, 'apple-touch-icon-180.png') },
  { size: 192, html: standardHtmlPath, out: path.join(publicDir, 'icon-192.png') },
  { size: 512, html: standardHtmlPath, out: path.join(publicDir, 'icon-512.png') },
];

for (const t of targets) {
  const fileUrl = 'file:///' + t.html.replace(/\\/g, '/');
  const cmd = `"${chromeExe}" --headless --disable-gpu --hide-scrollbars --window-size=${t.size},${t.size} --screenshot="${t.out}" "${fileUrl}"`;
  console.log(`Generating ${path.basename(t.out)} (${t.size}x${t.size})...`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  fs.unlinkSync(standardHtmlPath);
  fs.unlinkSync(maskableHtmlPath);
} catch (e) {}

console.log('Successfully generated all PWA icons!');
