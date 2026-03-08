# SpotiMix — Tag-Powered Discovery Roadmap

A phased rollout of genre tag features that transform SpotiMix from an artist-first mixer into a music discovery engine.

---

## Phase 1: Genre Tag Browser ← **UP NEXT**

**Goal:** Click a genre tag, get 3 artists auto-filled, ready to generate.

- Add a "Browse by Genre" toggle as an alternative to artist search
- Fetch popular tags from Last.fm (`tag.getTopTags`) on load, cache them
- Display as a grid of clickable tag chips
- On click: fetch top artists for that tag (`tag.getTopArtists`), pick 3, fill slots
- Transition smoothly back to the artist view with slots populated
- User can swap out any of the 3 before generating

**Last.fm endpoints:**
- `tag.getTopTags` — global popular tags
- `tag.getTopArtists` — top artists for a given tag

---

## Phase 2: Smart Suggest (Tag-Based 3rd Artist)

**Goal:** After picking 1–2 artists, see their shared tags and click one to auto-fill remaining slots.

- After artist selection, fetch their tags (already done for liner notes)
- Show shared tags as clickable chips below the artist grid
- Click a tag → fetch `tag.getTopArtists` → fill empty slot(s) with artists that match
- Filter out already-selected artists
- Feels like the app "understands" your taste and completes the thought

**Depends on:** Phase 1 (reuses `tag.getTopArtists` fetch logic)

---

## Phase 3: Mood Presets

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

## Design Principles

- **Tags as the connective tissue** — they're what makes "David Bowie + Nick Cave" make sense (shared: art rock, post-punk) and what makes the suggestion of a 3rd artist feel natural
- **Progressive disclosure** — the genre browser is an entry point, not a replacement. Artist search stays for users who know what they want
- **Last.fm is the brain** — all tag intelligence comes from community-driven Last.fm data, no AI API needed
- **Each phase builds on the last** — tag fetching, artist-from-tag logic, and UI patterns are reused across phases

---

*Built with [Claude](https://claude.ai) by Anthropic*
