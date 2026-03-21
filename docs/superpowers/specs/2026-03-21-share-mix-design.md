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

If both `artists` and `tags` are present, `artists` wins.

## Share Button

**Location:** Results area, alongside "Save to Spotify", "Add to Queue", and "Reshuffle" buttons.

**Visibility:** Only shown after a mix is generated (same lifecycle as other result buttons).

**Style:** `.btn .btn-secondary` — consistent with existing buttons.

**Behavior:**
1. `buildShareURL()` reads current state:
   - Artist Mix: `artists[]` names, `trackMode`, `tracksPerArtist`
   - Tag Mix: tags from `currentMixLabel` or last-generated tag state, `tracksPerTag`
2. Adds `auto=1` (sharer already generated)
3. If `navigator.share` is available (mobile): opens native share sheet with `{ title: 'Check out this SpotiMix', url: shareURL }`
4. If native share unavailable or fails: copies URL to clipboard via `navigator.clipboard.writeText()`
5. Shows toast: "Link copied!" (clipboard) or no toast (native share handles its own UI)

## Recipient Flow

### In `init()`, after Spotify login succeeds

A new function `loadFromShareParams()` is called after `userId` is set in both `init()` branches (direct auth + token refresh). It runs after `mergeAndSync` is kicked off.

**Step 1: Parse and clean URL**
- Read `artists`, `tags`, `mode`, `count`, `tcount`, `auto` from `URLSearchParams`
- If no share params found, return immediately (normal app load)
- Clear share params from URL via `window.history.replaceState({}, '', REDIRECT_URI)`

**Step 2a: Artist Mix path (`?artists=...`)**
1. Split comma-separated names (max 3)
2. For each name, search Spotify: `spGet('/search?q=' + encodeURIComponent(name) + '&type=artist&limit=1')`
3. Extract `{ name, image, sub }` from the first result
4. Populate `artists[]` slots, call `renderAllSlots()`, `updateSuggest()`
5. Set `trackMode` from `mode` param (if valid), `tracksPerArtist` from `count` param (if valid number 1-10)
6. Update UI controls to reflect the mode/count
7. If `auto=1`: call `generate()`

**Step 2b: Tag Mix path (`?tags=...`)**
1. Split comma-separated tags (max 3)
2. Add each to `selectedGenres` Set
3. Switch to Browse tab (`switchEntry('browse')`)
4. Render selected genre chips in the UI
5. Set `tracksPerTag` from `tcount` param (if valid number 1-10)
6. If `auto=1`: call `generateTagMix()`

### Error handling

- Artist search returns no results for a name: skip that slot, show toast "Couldn't find {name}"
- All artists fail: show toast "Couldn't load shared mix", land on empty state
- Invalid params (bad mode, non-numeric count): ignore, use defaults
- No share params in URL: function returns immediately, no side effects

## Code Changes

### Files modified

| File | Change |
|------|--------|
| `js/ui.js` | Add `buildShareURL()`, `handleShare()`, `loadFromShareParams()`. Call `loadFromShareParams()` in both `init()` branches. |
| `index.html` | Add "Share Mix" button in results area |

### No new files

All logic fits in `ui.js` alongside existing results-area code.

### Functions

- **`buildShareURL()`** — Pure function. Reads `artists[]` (or tag state), `trackMode`, `tracksPerArtist`/`tracksPerTag`. Returns a URL string.
- **`handleShare()`** — Calls `buildShareURL()`, then `navigator.share()` or `navigator.clipboard.writeText()`. Shows toast.
- **`loadFromShareParams()`** — Async. Reads URL params, searches Spotify for artists or populates tags, optionally calls `generate()`/`generateTagMix()`. Called in `init()` after login.

## What's NOT in scope

- Sharing saved combos from combo cards (only from results area)
- Short URLs or URL shortening
- Sharing the exact track list (recipient gets a fresh generation from the same inputs)
- QR code generation
- Social media preview/OG meta tags
- Share without Spotify login
