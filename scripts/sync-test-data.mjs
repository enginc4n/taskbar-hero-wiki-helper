/**
 * Download game JSON into test/ for offline local dev (no CORS).
 * Layout mirrors what src/data/api.ts loads in development.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test');

const ENRICHED_BASE = 'https://www.taskbarherowiki.com/data';
const WIKI_BASE = 'https://www.taskbarhero.wiki/data';

const ENRICHED_FILES = [
  'items.json',
  'heroes.json',
  'effects.json',
  'runes.json',
  'meta.json',
  'pets.json',
];

const WIKI_FILES = [
  'heroes.json',
  'passive_skills.json',
  'items.json',
  'items_detail.json',
  'gear_types.json',
  'rune_tree.json',
  't/pets.json',
  't/pet_stats.json',
];

async function syncFile(baseUrl, outSubdir, relativePath) {
  const url = `${baseUrl}/${relativePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const outPath = path.join(ROOT, outSubdir, relativePath);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  console.log(`Synced test/${outSubdir}/${relativePath}`);
}

await Promise.all([
  ...ENRICHED_FILES.map((f) => syncFile(ENRICHED_BASE, 'enriched', f)),
  ...WIKI_FILES.map((f) => syncFile(WIKI_BASE, 'wiki', f)),
]);

console.log(`Local test data written to ${ROOT}`);
