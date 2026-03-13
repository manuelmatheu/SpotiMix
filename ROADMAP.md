# SpotiMix — Roadmap

A phased plan for evolving SpotiMix from a playlist generator into a standalone music discovery app.

---

## Phase 1: Genre Tag Browser ✅ **SHIPPED**

- "Browse genres" toggle as alternative entry point
- Multi-genre selection (up to 3 tags)
- Last.fm tag discovery → Spotify artist lookup
- Clickable context tags in "About this mix" panel

---

## Phase 2: Smart Suggest (Tag-Based 3rd Artist) ✅ **SHIPPED**

- "Suggest from:" bar appears when 1–2 artists selected with empty slots
- Fetches and ranks tags from selected artists (shared tags first)
- Click a tag → Last.fm top artists → Spotify lookup → fills next empty slot
- Filters out already-selected artists
- Refreshes suggestions as artists are added/removed

---

## Phase 3: Mood Presets ← **UP NEXT**

**Goal:** One-click mood-based mixes that combine multiple tags.

- Curated mood cards above the genre grid: "Melancholy", "Late Night Drive", "Sunday Morning", "Raw Energy", "Dreamy", etc.
- Each mood maps to 2–3 Last.fm tags (e.g., Melancholy = sad + ambient + shoegaze)
- On click: fetch top artists across all tags, blend and deduplicate, pick 3
- Could also set the track mode automatically (e.g., Melancholy → Deep Cuts)

**Mood → tag mapping (draft):**

| Mood | Tags |
|------|------|
| Melancholy | sad, ambient, melancholy |
| Late Night Drive | electronic, chillwave, synthwave |
| Sunday Morning | acoustic, folk, singer-songwriter |
| Raw Energy | punk, garage rock, post-punk |
| Dreamy | shoegaze, dream pop, ethereal |
| Soul Kitchen | soul, funk, rnb |
| Deep Focus | post-rock, minimal, instrumental |

---

## Phase 4: Genre Radio / "Feeling Lucky"

**Goal:** Instant mix from a random or selected genre — no artist picking needed.

- "I'm Feeling Lucky" button picks a random tag and generates immediately
- Or select a tag from the browser and hit "Genre Radio" to skip artist selection
- Fetches 6–10 top artists for the tag, picks tracks from each, shuffles
- Wider artist pool than the standard 3-artist flow
- Could become its own track mode alongside Top/Deep/Mix/Discovery

---

## Phase 5: Embedded Player

**Goal:** Full in-app audio playback — no need to have Spotify open separately.

**Approach:** Spotify Web Playback SDK + remote control fallback.

- **Embedded player** (primary): Uses the Web Playback SDK to create a Spotify Connect device inside the browser. Audio plays directly in the SpotiMix tab. Requires adding `streaming` to OAuth scopes (one-time re-auth).
- **Remote control** (fallback): Current behavior — controls an existing Spotify client. Used when the SDK can't initialize (e.g., mobile browsers where the SDK isn't supported).

**Player UI:**
- Persistent bottom bar: album art, track name/artist, play/pause, prev/next
- Seekable progress bar with elapsed/remaining time
- Volume control
- Track list still highlights current track via polling
- Smooth transitions between tracks

**Technical notes:**
- SDK is free, loaded from `sdk.scdn.co/spotify-player.js`
- ~50 lines to initialize the SDK device
- SDK provides events: `player_state_changed`, `ready`, `not_ready`
- Tradeoff: embedded audio stops if the tab is closed; remote control keeps playing independently
- Mobile browsers have limited SDK support — fallback to remote control is essential

**Cost:** $0 (SDK is free with Premium)

---

## Phase 6: Cloud-Synced Combos (Supabase)

**Goal:** Saved artist combos persist across devices and sessions, tied to the user's Spotify account.

**Approach:** Supabase JS client called directly from the browser — no backend needed.

- Use the Spotify `user_id` (already available from `/me`) as the row identifier
- Supabase JS client (`@supabase/supabase-js`) loaded from CDN, initialized with project URL + anon key
- Combos stored as a JSON column in a single `user_combos` table
- On login: fetch combos from Supabase, merge with any localStorage combos, deduplicate
- On save/delete combo: update both localStorage (instant) and Supabase (async)
- localStorage remains the primary read source for speed; Supabase is the sync layer

**Table schema (draft):**

```
user_combos
├── spotify_id  TEXT PRIMARY KEY  — from /me endpoint
├── combos      JSONB            — [{artists: [{name, image, sub}, ...]}, ...]
├── updated_at  TIMESTAMPTZ      — auto-updated
```

**Row Level Security:**
- Users can only read/write their own row (`spotify_id = auth.uid()` or match against a custom claim)
- Since we're using Spotify ID (not Supabase Auth), RLS can use a simpler policy: allow all operations where `spotify_id` matches the value passed in the request, validated client-side
- Alternatively: use Supabase anon key with a service-role insert policy, since the data is non-sensitive (just artist names)

**Sync logic:**
1. On app init (after Spotify login): `SELECT combos FROM user_combos WHERE spotify_id = ?`
2. Merge remote combos with local (deduplicate by artist-name set)
3. On combo save/delete: update localStorage immediately, then `UPSERT` to Supabase
4. Conflict resolution: last-write-wins (simple, combos are low-conflict)

**Migration from localStorage:**
- First login after this feature ships: local combos are pushed to Supabase
- After sync, both sources stay in agreement
- If Supabase is unreachable, app works normally with localStorage only

**Cost:** Supabase free tier (500MB database, 50K monthly active users) — more than enough

---

## Design Principles

- **Tags as the connective tissue** — they're what makes "David Bowie + Nick Cave" make sense (shared: art rock, post-punk) and what makes the suggestion of a 3rd artist feel natural
- **Progressive disclosure** — the genre browser is an entry point, not a replacement. Artist search stays for users who know what they want
- **Last.fm is the brain** — all tag intelligence comes from community-driven Last.fm data, no AI API needed
- **Each phase builds on the last** — tag fetching, artist-from-tag logic, and UI patterns are reused across phases
- **Play everywhere** — embedded player for the full experience, remote control as a reliable fallback

---

*Built with [Claude](https://claude.ai) by Anthropic*
