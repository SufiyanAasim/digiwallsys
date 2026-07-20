const { execFileSync } = require('node:child_process');
const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const roots = [
  'app.js', 'server.js', 'db.js', 'controllers', 'middleware', 'routes',
  'services', 'utils', 'workers', 'scripts',
];

function collect(path) {
  if (statSync(path).isDirectory()) {
    return readdirSync(path).flatMap((entry) => collect(join(path, entry)));
  }
  return path.endsWith('.js') ? [path] : [];
}

for (const file of roots.flatMap(collect)) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log('Backend syntax check passed.');
