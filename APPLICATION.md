# Taskbar Hero Wiki Helper — Application Notes

This document captures what is known about the **TBH Wiki Helper** project: purpose, architecture, data sources, UI, deployment, and current limitations. It is meant as internal reference for future development.

## Overview

**TBH Wiki Helper** is a browser-based companion app for the game [Taskbar Hero](https://www.taskbarhero.wiki/). It lets players experiment with builds without modifying their live save.

| | |
|---|---|
| **Repository** | https://github.com/enginc4n/taskbar-hero-wiki-helper |
| **Live site** | https://enginc4n.github.io/taskbar-hero-wiki-helper/ |
| **Stack** | Vite 6 + TypeScript (no React/Vue — vanilla DOM rendering) |
| **Current UI** | Build Simulator only (Gear Database tab removed from navigation) |

The app runs entirely in the browser. Save decryption and stat calculation happen client-side; nothing is uploaded to a server.

---

## What the app does today

### Build Simulator (primary screen)

The simulator mirrors the wiki save inspector’s stat engine and presents a game-like layout:

1. **Toolbar** — load a `.es3` save, start a new build, set a baseline for delta comparison
2. **Stats bar** — Attack Damage, Basic Attack DPS (with baseline deltas), Attack Speed, Crit
3. **Three-column build row**
   - **Left:** Passive skill tree (wiki-style tier sections, level rail, icon nodes, +/- controls)
   - **Center:** Hero equipment window (game UI frame, 10 gear slots, portrait, nameplate)
   - **Right:** Rune panel (scrollable cards with icons, effect text, level controls)
4. **Bottom:** Hero picker strip (all 6 heroes, outside the hero frame)

**Editable state:**

- Equip gear per slot (modal picker with grade/search/obtainable filters)
- Decoration / engraving / inscription sockets on gear that supports them
- Passive skill levels (grouped by hero level gates)
- Rune levels (flat list from enriched rune data)
- Hero selection (Knight, Ranger, Sorcerer, Priest, Abalist, Slayer)

**Save workflow:**

- Drop or pick `SaveFile_Live.es3` (or `.bak`)
- Decrypted locally with the known ES3 password (can change after game updates)
- Default Windows path: `%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`
- “Set Baseline” snapshots current stats so ATK/DPS show +/- vs that point

### Gear Database (dormant)

`src/ui/gear-page.ts` still exists: client-side filtering and pagination over all gear items (same approach as [taskbarhero.wiki/gear](https://www.taskbarhero.wiki/gear)). It is **not wired up** in `src/main.ts` — the tab was removed; only the simulator loads on startup.

---

## Architecture

```
index.html
  └── src/main.ts          Entry: load data → render simulator
        ├── src/data/api.ts           Dual data loading (enriched + wiki ref)
        ├── src/ui/simulator-page.ts  Main UI + event handling
        ├── src/simulator/build-state.ts  Save mutations (equip, passives, runes, sockets)
        ├── src/engine/stats.ts       Stat aggregation + DPS (ported from wiki)
        ├── src/engine/save-decrypt.ts  AES-CBC .es3 decryption
        ├── src/data/adapters.ts      Merge enriched + wiki reference maps
        ├── src/data/game-ui.ts       Gear slot positions, game UI asset URLs
        ├── src/data/skill-ui.ts      Passive tree visual asset URLs
        ├── src/data/icons.ts        Item/hero/rune icon URLs
        ├── src/gear/filter.ts        Shared gear filtering (sim picker + gear page)
        └── src/style.css             Layout and game-like styling
```

**Rendering model:** No framework. Each “page” is a function that sets `innerHTML` and binds click/change handlers. State lives in closure-scoped objects (`SimState` in `simulator-page.ts`).

**Build pipeline:**

```bash
npm run sync-wiki-data   # Download wiki JSON → public/wiki-data/
tsc                      # Type-check
vite build               # Bundle to dist/
```

`npm run build` runs all three. GitHub Actions runs this on every push to `main`.

---

## Data sources (dual strategy)

The app uses **two complementary JSON sources**:

### 1. Enriched API — `taskbarherowiki.com`

Used for UI-friendly data with CORS enabled (`Access-Control-Allow-Origin: *`).

| Endpoint | Purpose |
|----------|---------|
| `/data/items.json` | Gear list with grades, icons, stats, socket counts |
| `/data/heroes.json` | Hero definitions, passive trees, base stats |
| `/data/effects.json` | Decoration / engraving / inscription materials |
| `/data/runes.json` | Rune names, icons, max levels, effects |
| `/data/meta.json` | Grades, gear level ranges, filter metadata |

Icons: `https://www.taskbarherowiki.com/icons/{icon}.png`

Loaded at runtime in the browser via `loadEnrichedData()` in `src/data/api.ts`.

### 2. Raw wiki datamine — `taskbarhero.wiki/data`

Used by the **stat engine** (ported from the wiki save inspector). These files have **no CORS headers**, so they cannot be fetched directly from a static GitHub Pages site.

| File | Purpose |
|------|---------|
| `heroes.json` | Raw hero stat tables |
| `passive_skills.json` | Passive skill definitions for stat calc |
| `items.json` / `items_detail.json` | Item stat resolution |
| `gear_types.json` | Gear type metadata |
| `rune_tree.json` | Rune node graph for stat contributions |
| `t/pets.json`, `t/pet_stats.json` | Pet data (engine support; limited UI) |

**How CORS is handled:**

| Environment | Mechanism |
|-------------|-----------|
| **Dev** (`npm run dev`) | Vite proxy: `/wiki-data/*` → `taskbarhero.wiki/data/*` |
| **Production / GitHub Pages** | `scripts/sync-wiki-data.mjs` downloads ~8 MB at build time into `public/wiki-data/`; app reads same-origin `/wiki-data/` |

`getWikiBase()` in `api.ts` resolves the path using `import.meta.env.BASE_URL` and `window.location.origin` so GitHub Pages subpath deploys work (`/taskbar-hero-wiki-helper/wiki-data`).

### 3. Game UI assets (hotlinked)

Visual fidelity uses assets hosted on the wiki CDN (not bundled):

| Base URL | Used for |
|----------|----------|
| `taskbarhero.wiki/game/ui/` | Hero frame (`BG_hero.png`), gear slot frames, hero portraits, grade backgrounds |
| `taskbarhero.wiki/game/skills/` | Passive/active skill icons |
| `taskbarhero.wiki/game/monsters/SkillPointSection/` | Skill tree tier section backgrounds |

Defined in `src/data/game-ui.ts` and `src/data/skill-ui.ts`.

---

## UI layout details

### Hero equipment window

- Outer clip uses aspect ratio **318:210** (inventory area only; cropped above bag slots)
- Inner stage uses full **318:468** ratio so slot percentages align with the wiki inspector
- Ten gear slots positioned via `GEAR_SLOT_LAYOUT` (percent `left`/`top` from wiki layout)
- Hero portrait and nameplate use in-frame prev/next arrows plus the bottom hero picker strip
- Socket button (◆) appears on equipped items with decoration/engraving/inscription slots

### Skill tree

- One row per `HeroTreeGroup` from enriched hero data
- Level gate shown on vertical rail; sections lock until hero level ≥ gate
- Passive nodes: wiki frame states (normal / active / max), icon, level badge, hover +/- 
- Active skill nodes: display-only (no leveling UI yet)

### Rune panel

- Flat scrollable list from `ctx.runes.runes` (enriched API)
- Not a visual rune **tree graph** — each rune is a card with icon, name, effect, level controls

---

## Stat engine

Ported from the [taskbarhero.wiki save inspector](https://www.taskbarhero.wiki/save-inspector).

**Inputs:** `HeroSaveData` + full `PlayerSaveData` + merged `RefMaps` (wiki ref + enriched overlays)

**Contributions aggregated from:**

- Hero base stats
- Equipped gear (base + inherent stats)
- Socket effects (decoration / engraving / inscription)
- Passive skill levels
- Rune levels
- Pets (engine support; minimal simulator UI)

**Outputs:** `ComputedStats` — Attack Damage, Attack Speed, Crit Chance/Damage, HP, Armor, etc.

**DPS:** `computeBasicDps()` — simplified basic-attack DPS using current stats (same approach as wiki helper).

**Baseline comparison:** When a save is loaded and “Set Baseline” is clicked, ATK and DPS show formatted deltas vs that snapshot.

---

## Save file format

- Extension: `.es3` (Easy Save 3), optionally `.bak`
- Encryption: AES-128-CBC, PBKDF2-SHA1 (100 iterations), salt+IV in first 16 bytes
- Default password: `emuMqG3bLYJ938ZDCfieWJ` (`DEFAULT_ES3_PASSWORD` in `save-decrypt.ts`)
- Parsed into `PlayerSaveData`: heroes, items, runes, attributes (passives), pets, currency, inventory

`build-state.ts` mutates this structure: `equipItem`, `setPassiveLevel`, `setRuneLevel`, `applySocketsToItem`, etc.

---

## Deployment (GitHub Pages)

Workflow: `.github/workflows/deploy-pages.yml`

- Triggers on push to `main` (and manual `workflow_dispatch`)
- Sets `BASE_PATH=/taskbar-hero-wiki-helper/` for Vite `base`
- Runs `npm ci` → `npm run build` → uploads `dist/` → deploys via GitHub Pages

**One-time setup:** Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Local preview of production build:

```bash
npm run build
BASE_PATH=/taskbar-hero-wiki-helper/ npm run preview
```

---

## Key types

Defined in `src/types.ts`:

- `EnrichedItem`, `EnrichedHero`, `EffectMaterial`, `RuneGraph`, `MetaData` — enriched API shapes
- `WikiHero`, `WikiItem`, `WikiPassive`, etc. — raw wiki datamine shapes
- `PlayerSaveData`, `HeroSaveData`, `ItemSaveData` — save file structures
- `RefMaps` — lookup maps built from wiki JSON for the stat engine
- `HeroPart` — gear slot enum (`MAIN_WEAPON`, `HELMET`, …)

---

## Known limitations

| Area | Status |
|------|--------|
| Gear Database tab | Code exists; not exposed in UI |
| Rune UI | Flat list, not interactive rune tree graph |
| Active skills | Shown in tree; no leveling |
| Game UI assets | Hotlinked from wiki; offline/CDN outage affects appearance |
| DPS validation | Not systematically tested against wiki save inspector for all edge cases |
| ES3 password | Hardcoded; breaks if game updates encryption password |
| Pets | Engine hooks exist; no dedicated simulator panel |

---

## Possible future work

- Re-enable Gear Database as a tab or separate route
- Bundle game UI assets locally for reliability
- Full rune tree visualization using `rune_tree.json` graph
- Active skill leveling in the skill tree
- Pet panel and pet stat contribution UI
- Broader stat delta panel (not just ATK/DPS)
- Import/export modified build as pseudo-save or share link

---

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

- Enriched data: fetched live from taskbarherowiki.com
- Wiki ref data: proxied through Vite (`/wiki-data` → taskbarhero.wiki)

To refresh bundled wiki JSON without a full build:

```bash
npm run sync-wiki-data
```

---

## File reference (source)

| Path | Role |
|------|------|
| `src/main.ts` | App entry; loads data, renders simulator |
| `src/ui/simulator-page.ts` | Simulator UI, modals, event wiring |
| `src/ui/gear-page.ts` | Standalone gear browser (unused) |
| `src/data/api.ts` | Fetch enriched + wiki data |
| `src/data/adapters.ts` | Build/merge reference maps |
| `src/data/game-ui.ts` | Slot layout, game UI URLs |
| `src/data/skill-ui.ts` | Skill tree asset URLs |
| `src/data/icons.ts` | Icon URL helpers |
| `src/simulator/build-state.ts` | Save state mutations |
| `src/engine/stats.ts` | Stat calculation |
| `src/engine/save-decrypt.ts` | .es3 decryption |
| `src/gear/filter.ts` | Gear filter/pagination |
| `src/types.ts` | Shared TypeScript types |
| `src/style.css` | All styles |
| `scripts/sync-wiki-data.mjs` | Build-time wiki JSON sync |
| `vite.config.ts` | Base path, dev/preview proxy |
| `.github/workflows/deploy-pages.yml` | CI deploy to GitHub Pages |

---

*Last updated to reflect: simulator-only navigation (Gear Database tab removed), three-column build layout with wiki-style skill tree and rune panel, GitHub Pages deploy with build-time wiki data sync.*
