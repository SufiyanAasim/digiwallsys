const { existsSync, readdirSync, readFileSync } = require('node:fs');
const { dirname, extname, join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const ignored = new Set(['.git', 'node_modules', '.expo', 'dist', 'dist-ios', 'dist-web', 'artifacts']);
const markdownFiles = [];
const failures = [];

function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (extname(entry.name).toLowerCase() === '.md') markdownFiles.push(path);
  }
}

visit(root);
for (const file of markdownFiles) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^(?:https?:|mailto:|tel:)/i.test(target)) continue;
    target = decodeURIComponent(target);
    if (!existsSync(resolve(dirname(file), target))) failures.push(`${file.slice(root.length + 1)} -> ${target}`);
  }
}

if (failures.length) {
  console.error(`Broken local Markdown links:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`Documentation link check passed: ${markdownFiles.length} Markdown files.`);
