/** Copy website/ into railway/website when deploying from railway-only root. */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', '..', 'website');
const dest = path.join(__dirname, '..', 'website');

if (!fs.existsSync(src)) {
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Bundled website for Railway');
