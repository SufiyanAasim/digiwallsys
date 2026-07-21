const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');

const root = join(__dirname, '..');
const ignored = new Set(['.git', 'node_modules', '.expo', 'dist', 'dist-ios', 'dist-web', 'artifacts']);
const textExtensions = new Set(['.js', '.json', '.md', '.yml', '.yaml', '.sql', '.txt']);
// Construct retired names in fragments so only the canonical brand appears in source scans.
const legacyPattern = new RegExp([
  '\\bDigi' + 'Wal(?!lSys)',
  'Digi' + 'FE',
  'Digital ' + 'Wallet System',
  'Quick' + 'Pay',
].join('|'), 'i');
const failures = [];

function visit(path) {
  for (const entry of readdirSync(path)) {
    if (ignored.has(entry) || entry === 'check-name.js') continue;
    const fullPath = join(path, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      visit(fullPath);
      continue;
    }
    const dot = entry.lastIndexOf('.');
    const extension = dot >= 0 ? entry.slice(dot) : '';
    if (!textExtensions.has(extension)) continue;
    if (legacyPattern.test(readFileSync(fullPath, 'utf8'))) {
      failures.push(relative(root, fullPath));
    }
  }
}

visit(root);
if (failures.length) {
  console.error(`Legacy project naming remains in: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('Project naming check passed: digiwallsys is used consistently.');
