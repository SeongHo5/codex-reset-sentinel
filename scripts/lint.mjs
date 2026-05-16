import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['src', 'test'];
const forbidden = [
  /api\.x\.com/i,
  /developer\.twitter\.com/i,
  /nitter/i,
  /playwright/i,
  /puppeteer/i,
];
const allowedXFetchFiles = new Set(['src/search/statusUrl.ts']);
let failures = 0;

for (const file of await listFiles(roots)) {
  const content = await readFile(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      console.error(`Forbidden direct-X/scraping marker ${pattern} in ${file}`);
      failures += 1;
    }
  }
  if (!allowedXFetchFiles.has(file) && /fetch\s*\([^)]*x\.com/i.test(content)) {
    console.error(`Forbidden direct x.com fetch in ${file}`);
    failures += 1;
  }
}

if (failures > 0) process.exit(1);
console.log('lint passed: no direct X API/scraping markers found');

async function listFiles(paths) {
  const out = [];
  for (const path of paths) {
    await walk(path, out);
  }
  return out.filter((file) => /\.(ts|js|mjs|json|yml|yaml|md)$/.test(file));
}

async function walk(path, out) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const next = join(path, entry.name);
    if (entry.isDirectory()) await walk(next, out);
    else out.push(next);
  }
}
