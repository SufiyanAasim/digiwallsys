const { readFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { spawnSync } = require('node:child_process');

const [packageName, ...args] = process.argv.slice(2);
if (!packageName) {
  console.error('Usage: node scripts/run-package-bin.js <package> [...args]');
  process.exit(1);
}

const manifestPath = require.resolve(`${packageName}/package.json`, {
  paths: [process.cwd()],
});
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const bin = typeof manifest.bin === 'string'
  ? manifest.bin
  : manifest.bin?.[packageName] ?? Object.values(manifest.bin ?? {})[0];

if (!bin) {
  console.error(`${packageName} does not expose a matching command.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [join(dirname(manifestPath), bin), ...args], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
