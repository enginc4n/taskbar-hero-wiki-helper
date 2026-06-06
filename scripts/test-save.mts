import { readFileSync } from 'node:fs';
import { parseSaveFile } from '../src/engine/save-decrypt.ts';
import { loadAllData } from '../src/data/api.ts';
import { buildRefMaps, mergeRefMaps } from '../src/data/adapters.ts';
import { computeAllStats, computeBasicDps } from '../src/engine/stats.ts';

const buf = readFileSync('./SaveFile_Live.es3');
const parsed = await parseSaveFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const data = await loadAllData();
const refs = mergeRefMaps(buildRefMaps(data.wiki), {
  items: data.items,
  heroes: data.heroes,
  runes: data.runes,
});

const hero = parsed.PlayerSaveData.heroSaveDatas.find((h) => h.IsUnLock);
if (!hero) {
  console.log('No unlocked hero');
  process.exit(0);
}

const stats = computeAllStats(hero, parsed.PlayerSaveData, refs);
const dps = computeBasicDps(stats);
console.log('Hero', hero.heroKey, 'Lv', hero.Level);
console.log('ATK', stats.AttackDamage.toFixed(2));
console.log('DPS', Math.round(dps));
