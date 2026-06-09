import type { ComputedStats } from '@/core/types';

export type StatIconKey = keyof ComputedStats | 'Dps' | 'Attributes';

interface GlyphDef {
  viewBox?: string;
  body: string;
}

/** Pixel-art stat glyphs — inline SVG, no external assets */
const GLYPHS: Record<StatIconKey, GlyphDef> = {
  Attributes: {
    body: `
    <rect x="2" y="10" width="3" height="4" fill="#6b5420"/>
    <rect x="2" y="6" width="3" height="3" fill="#c9a227"/>
    <rect x="2" y="2" width="3" height="3" fill="#f0d060"/>
    <rect x="6" y="8" width="3" height="6" fill="#6b5420"/>
    <rect x="6" y="5" width="3" height="2" fill="#c9a227"/>
    <rect x="6" y="2" width="3" height="2" fill="#f0d060"/>
    <rect x="10" y="11" width="3" height="3" fill="#6b5420"/>
    <rect x="10" y="7" width="3" height="3" fill="#c9a227"/>
    <rect x="10" y="3" width="3" height="3" fill="#f0d060"/>
  `,
  },
  Dps: {
    viewBox: '0 0 24 24',
    body: `
    <!-- impact sparks -->
    <rect x="20" y="2" width="2" height="2" fill="#f0d060"/>
    <rect x="18" y="3" width="2" height="2" fill="#e8a030"/>
    <rect x="21" y="4" width="2" height="2" fill="#ff5142" opacity="0.85"/>
    <!-- motion trail -->
    <rect x="16" y="5" width="2" height="2" fill="#c9a227" opacity="0.55"/>
    <rect x="14" y="7" width="2" height="2" fill="#8b6914" opacity="0.45"/>
    <!-- blade -->
    <rect x="19" y="4" width="2" height="2" fill="#f5efe0"/>
    <rect x="17" y="6" width="2" height="2" fill="#e8dcc8"/>
    <rect x="15" y="8" width="2" height="2" fill="#e8dcc8"/>
    <rect x="13" y="10" width="2" height="2" fill="#ddd0bc"/>
    <rect x="11" y="12" width="2" height="2" fill="#e8dcc8"/>
    <rect x="9" y="14" width="2" height="2" fill="#c9a227"/>
    <!-- edge gleam -->
    <rect x="20" y="4" width="1" height="1" fill="#fff8e0"/>
    <rect x="18" y="6" width="1" height="1" fill="#fff8e0"/>
    <rect x="16" y="8" width="1" height="1" fill="#fff8e0"/>
    <rect x="14" y="10" width="1" height="1" fill="#fff8e0"/>
    <!-- guard -->
    <rect x="7" y="14" width="6" height="2" fill="#8b6914"/>
    <rect x="8" y="13" width="4" height="1" fill="#c9a227"/>
    <rect x="6" y="15" width="1" height="1" fill="#9a2828"/>
    <rect x="13" y="15" width="1" height="1" fill="#9a2828"/>
    <!-- grip -->
    <rect x="7" y="16" width="3" height="2" fill="#6b5420"/>
    <rect x="8" y="18" width="2" height="3" fill="#4a3820"/>
    <rect x="7" y="21" width="3" height="2" fill="#f0d060"/>
    <rect x="8" y="20" width="2" height="1" fill="#c9a227"/>
    <!-- second blade (crossed, lower) -->
    <rect x="4" y="17" width="2" height="2" fill="#d8cfc0"/>
    <rect x="6" y="15" width="2" height="2" fill="#e8dcc8"/>
    <rect x="8" y="13" width="2" height="2" fill="#e8dcc8"/>
    <rect x="10" y="11" width="2" height="2" fill="#c9a227"/>
    <rect x="5" y="18" width="1" height="1" fill="#fff8e0"/>
  `,
  },
  AttackDamage: {
    viewBox: '0 0 24 24',
    body: `
    <!-- blade -->
    <rect x="10" y="2" width="4" height="2" fill="#f0d060"/>
    <rect x="9" y="4" width="6" height="2" fill="#e8dcc8"/>
    <rect x="10" y="6" width="4" height="2" fill="#f5efe0"/>
    <rect x="10" y="8" width="4" height="2" fill="#e8dcc8"/>
    <rect x="10" y="10" width="4" height="2" fill="#ddd0bc"/>
    <rect x="10" y="12" width="4" height="2" fill="#e8dcc8"/>
    <rect x="11" y="14" width="2" height="2" fill="#c9a227"/>
    <!-- center fuller -->
    <rect x="11" y="5" width="2" height="8" fill="#d8cfc0" opacity="0.65"/>
    <!-- edge highlights -->
    <rect x="9" y="4" width="1" height="10" fill="#fff8e0"/>
    <rect x="14" y="4" width="1" height="10" fill="#b8a888" opacity="0.5"/>
    <!-- guard -->
    <rect x="7" y="15" width="10" height="2" fill="#8b6914"/>
    <rect x="8" y="14" width="8" height="1" fill="#c9a227"/>
    <rect x="6" y="16" width="1" height="1" fill="#9a2828"/>
    <rect x="17" y="16" width="1" height="1" fill="#9a2828"/>
    <!-- grip -->
    <rect x="10" y="17" width="4" height="3" fill="#6b5420"/>
    <rect x="11" y="20" width="2" height="2" fill="#4a3820"/>
    <!-- pommel -->
    <rect x="9" y="22" width="6" height="2" fill="#f0d060"/>
    <rect x="10" y="21" width="4" height="1" fill="#c9a227"/>
  `,
  },
  MaxHp: {
    body: `
    <rect x="5" y="3" width="2" height="2" fill="#9a2828"/>
    <rect x="9" y="3" width="2" height="2" fill="#9a2828"/>
    <rect x="4" y="5" width="2" height="2" fill="#c45a5a"/>
    <rect x="10" y="5" width="2" height="2" fill="#c45a5a"/>
    <rect x="3" y="7" width="10" height="2" fill="#9a2828"/>
    <rect x="4" y="9" width="8" height="2" fill="#c45a5a"/>
    <rect x="5" y="11" width="6" height="2" fill="#9a2828"/>
    <rect x="7" y="13" width="2" height="1" fill="#6b1818"/>
  `,
  },
  Armor: {
    body: `
    <rect x="4" y="2" width="8" height="2" fill="#8b6914"/>
    <rect x="3" y="4" width="10" height="2" fill="#c9a227"/>
    <rect x="2" y="6" width="12" height="6" fill="#6b6b78"/>
    <rect x="3" y="7" width="10" height="4" fill="#8a8a98"/>
    <rect x="5" y="8" width="6" height="2" fill="#c9a227"/>
    <rect x="4" y="12" width="8" height="2" fill="#4a4a58"/>
  `,
  },
  AttackSpeed: {
    body: `
    <rect x="2" y="7" width="2" height="2" fill="#f0d060"/>
    <rect x="4" y="5" width="2" height="2" fill="#c9a227"/>
    <rect x="6" y="3" width="2" height="2" fill="#f0d060"/>
    <rect x="8" y="5" width="2" height="2" fill="#c9a227"/>
    <rect x="10" y="7" width="2" height="2" fill="#f0d060"/>
    <rect x="8" y="9" width="2" height="2" fill="#c9a227"/>
    <rect x="6" y="11" width="2" height="2" fill="#f0d060"/>
    <rect x="4" y="9" width="2" height="2" fill="#c9a227"/>
    <rect x="7" y="7" width="2" height="2" fill="#e8dcc8"/>
  `,
  },
  CriticalChance: {
    body: `
    <rect x="7" y="1" width="2" height="2" fill="#f0d060"/>
    <rect x="5" y="3" width="6" height="2" fill="#c9a227"/>
    <rect x="4" y="5" width="8" height="2" fill="#e8a030"/>
    <rect x="3" y="7" width="10" height="2" fill="#c9a227"/>
    <rect x="4" y="9" width="8" height="2" fill="#8b6914"/>
    <rect x="5" y="11" width="6" height="2" fill="#6b5420"/>
    <rect x="7" y="13" width="2" height="2" fill="#9a2828"/>
  `,
  },
  CriticalDamage: {
    body: `
    <rect x="7" y="1" width="2" height="1" fill="#f0d060"/>
    <rect x="5" y="2" width="6" height="1" fill="#e8a030"/>
    <rect x="3" y="3" width="2" height="2" fill="#f0d060"/>
    <rect x="11" y="3" width="2" height="2" fill="#f0d060"/>
    <rect x="1" y="5" width="2" height="2" fill="#c9a227"/>
    <rect x="13" y="5" width="2" height="2" fill="#c9a227"/>
    <rect x="6" y="5" width="4" height="4" fill="#9a2828"/>
    <rect x="7" y="6" width="2" height="2" fill="#f0d060"/>
    <rect x="4" y="10" width="8" height="2" fill="#c9a227"/>
    <rect x="6" y="12" width="4" height="2" fill="#8b6914"/>
  `,
  },
  MovementSpeed: {
    body: `
    <rect x="3" y="10" width="8" height="3" fill="#6b5420"/>
    <rect x="4" y="9" width="6" height="1" fill="#8b6914"/>
    <rect x="5" y="8" width="4" height="1" fill="#c9a227"/>
    <rect x="2" y="11" width="2" height="2" fill="#4a3820"/>
    <rect x="12" y="11" width="2" height="2" fill="#4a3820"/>
    <rect x="6" y="5" width="2" height="3" fill="#e8dcc8"/>
    <rect x="5" y="4" width="4" height="1" fill="#c9a227"/>
    <rect x="7" y="3" width="2" height="1" fill="#f0d060"/>
  `,
  },
  CooldownReduction: {
    body: `
    <rect x="4" y="2" width="8" height="1" fill="#8b6914"/>
    <rect x="3" y="3" width="10" height="10" fill="#2a2218"/>
    <rect x="4" y="4" width="8" height="8" fill="#14100c"/>
    <rect x="7" y="4" width="2" height="5" fill="#e8dcc8"/>
    <rect x="8" y="8" width="3" height="2" fill="#c9a227"/>
    <rect x="11" y="2" width="2" height="2" fill="#f0d060"/>
    <rect x="12" y="3" width="1" height="1" fill="#e8a030"/>
  `,
  },
  CastSpeed: {
    body: `
    <rect x="7" y="1" width="2" height="2" fill="#f0d060"/>
    <rect x="6" y="3" width="4" height="2" fill="#c9a227"/>
    <rect x="5" y="5" width="6" height="2" fill="#9a6ac8"/>
    <rect x="4" y="7" width="8" height="3" fill="#6b4a98"/>
    <rect x="5" y="10" width="6" height="2" fill="#4a3068"/>
    <rect x="6" y="12" width="4" height="2" fill="#2a1838"/>
    <rect x="2" y="6" width="2" height="2" fill="#e8a030"/>
    <rect x="12" y="6" width="2" height="2" fill="#e8a030"/>
  `,
  },
};

export function statIconHtml(
  stat: StatIconKey,
  className = 'attr-icon-svg pixel-art',
): string {
  const glyph = GLYPHS[stat];
  if (!glyph) return '<span class="attr-icon-fallback" aria-hidden="true">◆</span>';

  const viewBox = glyph.viewBox ?? '0 0 16 16';
  return `<svg class="${className}" viewBox="${viewBox}" shape-rendering="crispEdges" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${glyph.body}</svg>`;
}
