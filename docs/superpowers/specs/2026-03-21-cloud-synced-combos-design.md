# Phase 6: Cloud-Synced Combos — Design Spec

## Goal

Saved artist combos persist across devices and sessions, tied to the user's Spotify account. localStorage remains the primary read source for speed; Supabase is the sync layer.

## Decisions

- **Storage:** Supabase (free tier), no backend needed
- **Auth:** Use Spotify `userId` (already available from `/me`) as row key — no Supabase Auth
- **RLS:** Disabled — data is non-sensitive (artist names/images only)
- **Scope:** Artist combos only — Tag Mix combos not included
- **Conflict resolution:** Merge + deduplicate (union of local and cloud, dedup by `comboKey()`)
- **Error handling:** Silent — log warnings, never surface Supabase failures to the user

## Supabase Config

- **Project URL:** `https://mhzfuamvkbuwlyahaqna.supabase.co`
- **Anon key:** public, safe to commit (same risk profile as Last.fm API key)

### Table schema

```
user_combos
  spotify_id  TEXT PRIMARY KEY    -- from Spotify /me endpoint
  combos      JSONB               -- [{artists: [{name, image, sub}, ...]}, ...]
  updated_at  TIMESTAMPTZ         -- auto-updated on upsert
```

## Architecture

### New file: `js/supabase.js`

Loads the Supabase JS client from CDN via dynamic `import()`. Exposes three global functions:

- **`fetchCloudCombos(spotifyId)`** — SELECT combos from `user_combos` where `spotify_id` matches. Returns array or `[]`.
- **`upsertCloudCombos(spotifyId, combos)`** — UPSERT full combos array with `updated_at = now()`.
- **`mergeAndSync(spotifyId, localCombos)`** — Fetches cloud combos, merges with local (dedup by `comboKey()`), writes merged result to both Supabase and localStorage, updates `savedCombos`, calls `renderCombos()`.

### Script load order

```html
<script src="js/config.js"></script>
<script src="js/spotify.js"></script>
<script src="js/lastfm.js"></script>
<script src="js/supabase.js"></script>   <!-- new -->
<script src="js/player.js"></script>
<script src="js/ui.js"></script>
```

### Config additions (`js/config.js`)

```js
const SUPABASE_URL  = 'https://mhzfuamvkbuwlyahaqna.supabase.co';
const SUPABASE_ANON = '...';  // anon key
let cloudSyncReady  = false;   // true once Supabase client initialized
```

### Changes to `ui.js`

Two touch points only:

1. **Init flow** (after Spotify login, `userId` is set): after `loadCombos()`, call `mergeAndSync(userId, savedCombos)` (async, non-blocking).

2. **`persistCombos()`**: after writing to localStorage, fire-and-forget `upsertCloudCombos(userId, savedCombos)`.

No changes to `saveCombo()`, `removeCombo()`, `loadCombo()`, or `renderCombos()` — they already go through `persistCombos()`.

## Sync flows

### On login

```
Spotify login succeeds -> userId set
  -> loadCombos()              // read localStorage
  -> mergeAndSync(userId)      // async, non-blocking
      -> fetchCloudCombos(userId)
      -> merge local + cloud (dedup by comboKey)
      -> upsertCloudCombos(userId, merged)
      -> localStorage.setItem(merged)
      -> savedCombos = merged
      -> renderCombos()
```

### On save/remove

```
saveCombo() or removeCombo()
  -> persistCombos()
      -> localStorage.setItem(savedCombos)        // instant
      -> upsertCloudCombos(userId, savedCombos)    // async, fire-and-forget
```

### First-time migration

User has combos in localStorage but nothing in Supabase. `mergeAndSync` pushes local combos to cloud automatically. No special migration code needed.

## Error handling

All Supabase failures are silent:

- `fetchCloudCombos` fails: log warning, continue with localStorage only
- `upsertCloudCombos` fails: log warning, localStorage already has the data
- `mergeAndSync` fails: log warning, combos still work from localStorage
- No toasts, no error UI — Supabase is invisible to the user when down

## What's NOT in scope

- Tag Mix combo syncing
- Supabase Auth integration
- Row Level Security policies
- Offline queue / retry logic (next login reconciles naturally)
- UI indicators for sync status
