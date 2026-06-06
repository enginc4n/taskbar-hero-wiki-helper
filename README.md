# TBH Wiki Helper

Browser-based Taskbar Hero companion: **gear database** (same client-side filtering as [taskbarhero.wiki/gear](https://www.taskbarhero.wiki/gear)) and a **build simulator** with ATK/DPS deltas, gear swapping, runes, passives, and decoration/engraving/inscription sockets.

## Data sources

- [taskbarherowiki.com/data/*.json](https://www.taskbarherowiki.com/data/items.json) — enriched items, heroes, effects, runes (CORS enabled)
- [taskbarhero.wiki/data/*.json](https://www.taskbarhero.wiki/data/) — raw datamine used by the ported save-inspector stat engine

## Features

- **Gear Database** — filter by rarity, category, level, name; pagination (60 per page); obtainable-only toggle
- **Build Simulator** — load `.es3` save or start fresh; edit gear, passives, runes, sockets; compare ATK/DPS vs baseline

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

**Note:** `taskbarhero.wiki` JSON (used by the stat engine) has no CORS headers. In dev, Vite proxies `/wiki-data/*` to that site. For production builds, `npm run sync-wiki-data` copies those files into `public/wiki-data/` so the app loads them from the same origin.

## GitHub Pages

Pushes to `main` deploy via GitHub Actions to:

`https://enginc4n.github.io/taskbar-hero-wiki-helper/`

Enable **Settings → Pages → Build and deployment → GitHub Actions** on the repo if this is the first deploy.

The build downloads wiki JSON at build time (~8 MB) and bundles it with the static site, so no browser proxy or cross-origin fetch to `taskbarhero.wiki` is needed in production.

## Save file

Drop your live save (`SaveFile_Live.es3`) in the simulator tab. Default path on Windows:

`%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`

Decryption runs entirely in the browser; nothing is uploaded.
