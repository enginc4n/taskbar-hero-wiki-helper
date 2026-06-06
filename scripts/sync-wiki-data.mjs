import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WIKI_BASE = 'https://www.taskbarhero.wiki/data';
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'wiki-data');

const FILES = [
  'heroes.json',
  'passive_skills.json',
  'items.json',
  'items_detail.json',
  'gear_types.json',
  'rune_tree.json',
  't/pets.json',
  't/pet_stats.json',
];

async function syncFile(relativePath) {
  const url = `${WIKI_BASE}/${relativePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const outPath = path.join(OUT_DIR, relativePath);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  console.log(`Synced ${relativePath}`);
}

await Promise.all(FILES.map(syncFile));
console.log(`Wiki data written to ${OUT_DIR}`);
