/** Copy website/ + nfc-site/ into railway/ when deploying from railway-only root. */
const fs = require('fs');
const path = require('path');

function bundle(name) {
  const src = path.join(__dirname, '..', '..', name);
  const dest = path.join(__dirname, '..', name);
  if (!fs.existsSync(src)) return;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`Bundled ${name} for Railway`);
}

bundle('website');
bundle('nfc-site');
