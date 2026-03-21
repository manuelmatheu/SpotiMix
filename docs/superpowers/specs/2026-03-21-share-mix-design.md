# Share Mix via URL — Design Spec

## Goal

Users can share a generated mix (artist or tag-based) via a URL. Recipients open the link, log into Spotify, and either see pre-filled slots or get the mix auto-generated.

## Decisions

- **Approach:** URL query params only — no backend, no database, no expiring links
- **Share trigger:** "Share Mix" button in the results area (only after generating)
- **Clipboard/native share:** Copy to clipboard on desktop; native share sheet on mobile (`navigator.share`), with clipboard fallback
- **Recipient login:** Required — app already requires Spotify login for all functionality
- **Auto-generate:** If the sharer already generated (`auto=1` param), recipient auto-generates on load. Otherwise, slots are pre-filled only.
- **URL cleanup:** Share params are cleared from URL after processing (same `replaceState` pattern as OAuth)

## URL Format

### Artist Mix

```
https://spotimix-app.vercel.app/?artists=Radiohead,Portishead,Massive%20Attack&mode=deep&count=5&auto=1
```

### Tag Mix

```
https://spotimix-app.vercel.app/?tags=shoegaze,dream%20pop,post-punk&tcount=5&auto=1
```

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `artists` | string | for Artist Mix | — | Comma-separated artist names, URL-encoded |
| `tags` | string | for Tag Mix | — | Comma-separated genre tags, URL-encoded |
| `mode` | string | no | `top` | Track mode: `top`, `deep`, `mix`, `discovery` |
| `count` | number | no | `5` | Tracks per artist |
| `tcount` | number | no | `5` | Tracks per tag |
| `auto` | string | no | — | If `1`, auto-generate on load |

If both `artists` and `tags` are present, `artists` wins. More than 3 artists or tags: take the first 3, ignore the rest.

## Share Params Persistence Through OAuth

When a recipient opens a share URL without being logged in:

1. They land on `?artists=Radiohead,Portishead&mode=deep&auto=1`
2. They click "Connect with Spotify"
3. Spotify redirects back with `?code=...` — the share params are lost

**Solution:** Before calling `startAuth()`, persist share params in `sessionStorage`:

```
sessionStorage.setItem('share_params', window.location.search)
```

In `loadFromShareParams()`, check `sessionStorage` first, then fall back to `URLSearchParams(window.location.search)`. Clear the stored value after consumption.

This is the only change needed in `spotify.js` — a single `sessionStorage.setItem` call at the top of `startAuth()`.

## Share Button

**Location:** Results area, alongside "Save to Spotify", "Add to Queue", and "Reshuffle" buttons.

**Visibility:** Only shown after a mix is generated (same lifecycle as other result buttons).

**Style:** `.btn .btn-secondary` — consistent with existing buttons.

**Behavior:**
1. `buildShareURL()` reads current state:
   - Determines mix type from `lastMixType` global (`'artist'` or `'tag'`)
   - Artist Mix: `artists[]` names, `trackMode`, `tracksPerArtist`
   - Tag Mix: `lastMixTags` array, `tracksPerTag`
2. Adds `auto=1` (sharer already generated)
3. If `navigator.share` is available (mobile): opens native share sheet with `{ title: 'Check out this SpotiMix', url: shareURL }`
4. If native share unavailable or fails: copies URL to clipboard via `navigator.clipboard.writeText()`
5. Shows toast: "Link copied!" (clipboard) or no toast (native share handles its own UI)

## State Tracking for Share

Two new globals in `config.js`:

```js
let lastMixType = null;   // 'artist' or 'tag' — set during generate()/generateTagMix()
let lastMixTags = [];     // tag names from last Tag Mix — set during generateTagMix()
```

- `generate()` sets `lastMixType = 'artist'`
- `generateTagMix()` sets `lastMixType = 'tag'` and `lastMixTags = [...tags]` (before `selectedGenres.clear()`)

This avoids parsing tag names back from `currentMixLabel` which is fragile.

## Recipient Flow

### In `init()`, after Spotify login succeeds

A new function `loadFromShareParams()` is called after `userId` is set in both `init()` branches (direct auth + token refresh). It runs after `mergeAndSync` is kicked off.

**Step 1: Read share params**
- Check `sessionStorage.getItem('share_params')` first (persisted through OAuth redirect)
- Fall back to `window.location.search` (direct visit while already logged in)
- Parse with `URLSearchParams`
- If no `artists` or `tags` param found, return immediately (normal app load)
- Clear `sessionStorage` share_params after reading
- Clear share params from URL via `window.history.replaceState({}, '', REDIRECT_URI)`

**Step 2a: Artist Mix path (`?artists=...`)**
1. Split comma-separated names, take first 3
2. For each name, try/catch: search Spotify `spGet('/search?q=' + encodeURIComponent(name) + '&type=artist&limit=1')`
3. Extract `{ name, image, sub }` from the first result. If search fails or returns no results, skip that slot and show toast "Couldn't find {name}"
4. Populate `artists[]` slots, call `renderAllSlots()`, `updateSuggest()`
5. Set `trackMode` from `mode` param (if valid: one of `top`, `deep`, `mix`, `discovery`)
6. Set `tracksPerArtist` from `count` param (if valid number 1-10)
7. Update UI controls: active button in `#mode-control` segment, `#track-count` text
8. If `auto=1` and at least 1 artist was found: call `generate()`

**Step 2b: Tag Mix path (`?tags=...`)**
1. Split comma-separated tags, take first 3
2. Add each to `selectedGenres` Set
3. Set `tracksPerTag` from `tcount` param (if valid number 1-10)
4. Call `setEntry('browse')` — this triggers `loadGenres()` which reads `selectedGenres` when rendering chips, so populating the Set first ensures chips render as selected
5. If `auto=1`: call `generateTagMix()`

### Error handling

- Artist search fails (network, 429, no results): skip that slot, show toast "Couldn't find {name}"
- All artists fail: show toast "Couldn't load shared mix", land on empty state
- Invalid params (bad mode, non-numeric count): ignore, use defaults
- No share params in URL or sessionStorage: function returns immediately, no side effects

### Timing relative to OAuth

Share param parsing happens **after** OAuth code exchange. The flow is:

```
init()
  → exchangeCode(code)          // consumes ?code=, clears URL
  → spGet('/me')                 // get userId
  → mergeAndSync(...)            // cloud combo sync
  → loadFromShareParams()        // reads from sessionStorage (params persisted before auth)
```

No collision between `?code=` and share params — they never coexist in the URL.

## Code Changes

### Files modified

| File | Change |
|------|--------|
| `js/config.js` | Add `lastMixType` and `lastMixTags` globals |
| `js/spotify.js` | Add `sessionStorage.setItem('share_params', ...)` at top of `startAuth()` |
| `js/ui.js` | Add `buildShareURL()`, `handleShare()`, `loadFromShareParams()`. Set `lastMixType`/`lastMixTags` in `generate()`/`generateTagMix()`. Call `loadFromShareParams()` in both `init()` branches. |
| `index.html` | Add "Share Mix" button in results area |

### No new files

All logic fits in existing files.

### Functions

- **`buildShareURL()`** — Pure function. Reads `lastMixType`, `artists[]` or `lastMixTags`, `trackMode`, `tracksPerArtist`/`tracksPerTag`. Returns a URL string.
- **`handleShare()`** — Calls `buildShareURL()`, then `navigator.share()` or `navigator.clipboard.writeText()`. Shows toast.
- **`loadFromShareParams()`** — Async. Reads share params from sessionStorage or URL, searches Spotify for artists or populates tags, optionally calls `generate()`/`generateTagMix()`. Called in `init()` after login.

## What's NOT in scope

- Sharing saved combos from combo cards (only from results area)
- Short URLs or URL shortening
- Sharing the exact track list (recipient gets a fresh generation from the same inputs)
- QR code generation
- Social media preview/OG meta tags
- Share without Spotify login
