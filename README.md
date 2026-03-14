# SpotiMix 🎶

A single-page web app that blends the top tracks of up to 3 artists into one shuffled Spotify playlist. Artist discovery is powered by Last.fm; playback and playlist saving use the Spotify Web API.

**Live app → [https://spotimix-app.vercel.app/](https://spotimix-app.vercel.app/)**

---

## How it works

1. Search for up to 3 artists via Spotify
2. Choose a track mode: **Top Hits**, **Deep Cuts**, **Mix**, or **Discovery**
3. Set how many tracks per artist (1–10)
4. Hit **Generate SpotiMix** — Last.fm fetches the tracks, Spotify matches and plays them
5. Click any track to play from that point; the current track is highlighted automatically
6. Save the result as a Spotify playlist or add it directly to your queue
7. Save your favorite artist combinations as combos for quick recall

### Track modes

| Mode | Source |
|------|--------|
| Top Hits | Last.fm ranks 1–10 by scrobble count |
| Deep Cuts | Last.fm ranks 11–50 by scrobble count |
| Mix | Half top hits, half deep cuts |
| Discovery | Your artists + 2 tracks each from 3 similar artists |

---

## File structure

```
mixtape/
├── index.html        — HTML structure only
├── css/
│   └── style.css     — All styles
└── js/
    ├── config.js     — API keys, shared state
    ├── spotify.js    — Auth, Spotify API, playback, playlist save
    ├── lastfm.js     — Last.fm track/similar artist fetching + Spotify matching
    ├── player.js     — Now-playing polling, highlight, click-to-play
    └── ui.js         — Search, slots, combos, generate, render, shortcuts, boot
```

---

## Stack

- **Vanilla HTML/JS** — no framework, no build step
- **Spotify Web API** — PKCE OAuth, search, playback, playlist creation
- **Last.fm API** — artist top tracks, similar artists, genre tags, bios
- **GitHub Pages** — static hosting

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `?` | Show shortcuts help |
| `Esc` | Close any modal or dropdown |
| `G` | Generate mix |
| `S` | Save current combo |
| `D` | Toggle dark / light mode |
| `↑` `↓` | Navigate autocomplete |
| `Enter` | Select autocomplete result |

---

## Setup

### 1. Spotify app

- Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
- Create an app (or reuse an existing one)
- Add your GitHub Pages URL as a Redirect URI: `https://YOURUSERNAME.github.io/mixtape/`
- Copy the Client ID

### 2. Configuration

Open `js/config.js` and update the two constants:

```js
const SPOTIFY_CLIENT_ID = 'your_spotify_client_id';
const LASTFM_API_KEY    = 'your_lastfm_api_key';
```

Get a free Last.fm API key at [last.fm/api](https://www.last.fm/api/account/create).

### 3. Deploy

Push to a GitHub repo with Pages enabled (Settings → Pages → Deploy from `main` branch root).

---

## Notes

- Requires a **Spotify Premium** account for playback and queue management
- Deep Cuts quality depends on how well-scrobbled an artist is on Last.fm
- Spotify matching can occasionally miss tracks with non-standard characters; unmatched tracks are skipped with a warning

---

## Changelog

### v1.3
- Mood Presets: 10 one-click mood cards (Melancholy, Late Night, Sunday Morning, Raw Energy, Dreamy, Soul Kitchen, Deep Focus, Midnight Jazz, Headbanger, Tropicália)
- Each mood maps to 2–3 Last.fm tags and auto-sets track mode
- Smart Suggest now includes similar artists (rust-colored chips) alongside genre tags

### v1.2
- Smart Suggest: pick 1–2 artists, see genre tags, click to auto-fill remaining slots
- Tags ranked by relevance (shared tags first for multi-artist)
- Suggestions powered by Last.fm tags + Spotify artist search
- Liner notes rewritten with template pool system (150+ unique combinations)

### v1.1
- Genre tag browser as alternative entry point (Browse genres tab)
- Multi-genre selection (up to 3 tags) with Spotify artist lookup
- Clickable context tags in "About this mix" panel
- Interleave shuffle (no consecutive same-artist tracks)
- Spotify repeat disabled after playback starts
- Refresh token support for persistent login

### v1.0
- "About this mix" panel with Last.fm-powered liner notes
- Narrative built from genre tags, artist bios, shared/unique traits
- Genre tag chips
- Spotify login and theme now persist across sessions (moved to localStorage)
- Full mobile responsive layout fixes

### v0.9
- "About this mix" collapsible panel with Last.fm-powered liner notes
- Narrative engine built from genre tags, artist bios, shared/unique traits
- Adapts to track mode (deep cuts, discovery, etc.)
- Genre tag chips
- Renamed to SpotiMix

### v0.8
- Saved combos: store and recall artist combinations
- Keyboard shortcuts with `?` help modal
- Scrollable changelog modal
- Full mobile responsive layout

### v0.7
- Dark / light theme toggle with system preference detection
- Fixed now-playing highlight (added missing Spotify read scopes)
- Fixed save playlist (tracks now actually added, not just empty playlist)
- Playlist opens in Spotify after save

### v0.6
- Artist search now uses Spotify only (faster, cleaner results)
- Now-playing highlight follows track skips in real time
- Polling fires immediately on playback start

### v0.5
- Now-playing highlight: current track shown in rust red
- Click any track to play from that point, queuing the rest
- Play icon replaces track number on hover and while playing
- Split into `css/` and `js/` files, cassette 📼 favicon

### v0.4
- Discovery mode: adds 2 tracks each from 3 similar artists per selection
- Similar artists sourced from Last.fm, deduplicated across selections

### v0.3
- Auto-play on generation
- Fixed 403 error when saving playlists
- Device fallback for idle Spotify clients

### v0.2
- Switched to Last.fm for artist track discovery
- Deep Cuts defined as Last.fm ranks 11–50 by scrobble count
- Optional Last.fm play count display per track
- Spotify track matching with exact artist name preference

### v0.1
- Initial build: Spotify PKCE OAuth, 3 artist slots, Top/Deep/Mix modes, shuffled playlists, save + queue

---

Built with [Claude](https://claude.ai) by Anthropic
