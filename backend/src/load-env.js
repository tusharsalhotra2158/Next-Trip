// Minimal .env loader (no external dependency). Reads backend/.env, if present,
// and sets any KEY=VALUE pairs onto process.env that aren't already set
// (so real environment variables always take priority over the file).
const fs = require('fs');
const path = require('path');

function loadEnv(filePath = path.join(__dirname, '..', '.env')) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnv();

module.exports = { loadEnv };
