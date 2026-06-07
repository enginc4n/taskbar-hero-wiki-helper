# Local test data (dev only)

During `npm run dev`, the app loads JSON from this folder instead of remote APIs (avoids CORS).

## Layout

```
test/
  enriched/          ← taskbarherowiki.com shape
    items.json
    heroes.json
    effects.json
    runes.json
    meta.json
  wiki/                ← taskbarhero.wiki shape (stat engine)
    heroes.json
    passive_skills.json
    items.json
    items_detail.json
    gear_types.json
    rune_tree.json
    t/pets.json
    t/pet_stats.json
```

## Populate files

```bash
npm run sync-test-data
```

You can also copy files manually into `test/enriched/` and `test/wiki/` if you already have them.

Production builds still use `npm run sync-wiki-data` → `public/wiki-data/` plus live enriched API.
