import type { ComputedStats } from '../types';

export type StatIconKey = keyof ComputedStats | 'Dps' | 'Attributes';

/** 16×16 pixel-art stat glyphs — inline SVG, no external assets */
const GLYPHS: Record<StatIconKey, string> = {
  Attributes: `
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
  Dps: `
    <rect x="7" y="1" width="2" height="2" fill="#f0d060"/>
    <rect x="6" y="3" width="4" height="1" fill="#c9a227"/>
    <rect x="7" y="4" width="2" height="6" fill="#e8dcc8"/>
    <rect x="5" y="10" width="6" height="1" fill="#8b6914"/>
    <rect x="4" y="11" width="1" height="2" fill="#6b5420"/>
    <rect x="11" y="11" width="1" height="2" fill="#6b5420"/>
    <rect x="2" y="12" width="3" height="2" fill="#9a2828"/>
    <rect x="11" y="12" width="3" height="2" fill="#9a2828"/>
  `,
  AttackDamage: `
    <rect x="7" y="1" width="2" height="2" fill="#f0d060"/>
    <rect x="7" y="3" width="2" height="7" fill="#e8dcc8"/>
    <rect x="6" y="4" width="1" height="5" fill="#c9a227"/>
    <rect x="9" y="4" width="1" height="5" fill="#c9a227"/>
    <rect x="5" y="10" width="6" height="1" fill="#8b6914"/>
    <rect x="3" y="11" width="2" height="2" fill="#9a2828"/>
    <rect x="11" y="11" width="2" height="2" fill="#9a2828"/>
  `,
  MaxHp: `
    <rect x="5" y="3" width="2" height="2" fill="#9a2828"/>
    <rect x="9" y="3" width="2" height="2" fill="#9a2828"/>
    <rect x="4" y="5" width="2" height="2" fill="#c45a5a"/>
    <rect x="10" y="5" width="2" height="2" fill="#c45a5a"/>
    <rect x="3" y="7" width="10" height="2" fill="#9a2828"/>
    <rect x="4" y="9" width="8" height="2" fill="#c45a5a"/>
    <rect x="5" y="11" width="6" height="2" fill="#9a2828"/>
    <rect x="7" y="13" width="2" height="1" fill="#6b1818"/>
  `,
  Armor: `
    <rect x="4" y="2" width="8" height="2" fill="#8b6914"/>
    <rect x="3" y="4" width="10" height="2" fill="#c9a227"/>
    <rect x="2" y="6" width="12" height="6" fill="#6b6b78"/>
    <rect x="3" y="7" width="10" height="4" fill="#8a8a98"/>
    <rect x="5" y="8" width="6" height="2" fill="#c9a227"/>
    <rect x="4" y="12" width="8" height="2" fill="#4a4a58"/>
  `,
  AttackSpeed: `
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
  CriticalChance: `
    <rect x="7" y="1" width="2" height="2" fill="#f0d060"/>
    <rect x="5" y="3" width="6" height="2" fill="#c9a227"/>
    <rect x="4" y="5" width="8" height="2" fill="#e8a030"/>
    <rect x="3" y="7" width="10" height="2" fill="#c9a227"/>
    <rect x="4" y="9" width="8" height="2" fill="#8b6914"/>
    <rect x="5" y="11" width="6" height="2" fill="#6b5420"/>
    <rect x="7" y="13" width="2" height="2" fill="#9a2828"/>
  `,
  CriticalDamage: `
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
  MovementSpeed: `
    <rect x="3" y="10" width="8" height="3" fill="#6b5420"/>
    <rect x="4" y="9" width="6" height="1" fill="#8b6914"/>
    <rect x="5" y="8" width="4" height="1" fill="#c9a227"/>
    <rect x="2" y="11" width="2" height="2" fill="#4a3820"/>
    <rect x="12" y="11" width="2" height="2" fill="#4a3820"/>
    <rect x="6" y="5" width="2" height="3" fill="#e8dcc8"/>
    <rect x="5" y="4" width="4" height="1" fill="#c9a227"/>
    <rect x="7" y="3" width="2" height="1" fill="#f0d060"/>
  `,
  CooldownReduction: `
    <rect x="4" y="2" width="8" height="1" fill="#8b6914"/>
    <rect x="3" y="3" width="10" height="10" fill="#2a2218"/>
    <rect x="4" y="4" width="8" height="8" fill="#14100c"/>
    <rect x="7" y="4" width="2" height="5" fill="#e8dcc8"/>
    <rect x="8" y="8" width="3" height="2" fill="#c9a227"/>
    <rect x="11" y="2" width="2" height="2" fill="#f0d060"/>
    <rect x="12" y="3" width="1" height="1" fill="#e8a030"/>
  `,
  CastSpeed: `
    <rect x="7" y="1" width="2" height="2" fill="#f0d060"/>
    <rect x="6" y="3" width="4" height="2" fill="#c9a227"/>
    <rect x="5" y="5" width="6" height="2" fill="#9a6ac8"/>
    <rect x="4" y="7" width="8" height="3" fill="#6b4a98"/>
    <rect x="5" y="10" width="6" height="2" fill="#4a3068"/>
    <rect x="6" y="12" width="4" height="2" fill="#2a1838"/>
    <rect x="2" y="6" width="2" height="2" fill="#e8a030"/>
    <rect x="12" y="6" width="2" height="2" fill="#e8a030"/>
  `,
};

export function statIconHtml(
  stat: StatIconKey,
  className = 'attr-icon-svg pixel-art',
): string {
  const body = GLYPHS[stat];
  if (!body) return '<span class="attr-icon-fallback" aria-hidden="true">◆</span>';

  return `<svg class="${className}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
