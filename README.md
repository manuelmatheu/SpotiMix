# Mixtape 🎶

A single-page web app that blends the top tracks of up to 3 artists into one shuffled Spotify playlist. Artist discovery is powered by Last.fm; playback and playlist saving use the Spotify Web API.

**Live app → [manuelmatheu.github.io/mixtape](https://manuelmatheu.github.io/mixtape/)**

---

## How it works

1. Search for up to 3 artists via Spotify
2. Choose a track mode: **Top Hits**, **Deep Cuts**, **Mix**, or **Discovery**
3. Set how many tracks per artist (1–10)
4. Hit **Generate Mixtape** — Last.fm fetches the tracks, Spotify matches and plays them
5. Click any track to play from that point; the current track is highlighted automatically
6. Save the result as a Spotify playlist or add it directly to your queue

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
    └── ui.js         — Search, slots, generate, render, utils, boot
```

---

## Stack

- **Vanilla HTML/JS** — no framework, no build step
- **Spotify Web API** — PKCE OAuth, search, playback, playlist creation
- **Last.fm API** — artist top tracks, similar artists
- **GitHub Pages** — static hosting

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

### v0.6
- Artist search now uses Spotify only (faster, cleaner results)
- Now-playing highlight follows track skips in real time (poll every 2s)
- Polling fires immediately on playback start, not after first interval
- Fixed stale map guard that prevented highlight from updating after skips

### v0.5
- Now-playing highlight: current track shown in rust red
- Click any track to play from that point, queuing the rest
- Play icon replaces track number on hover and while playing
- Split into `css/` and `js/` files for easier maintenance
- Added cassette 📼 favicon

### v0.4
- Discovery mode: adds 2 tracks each from 3 similar artists per selection
- Similar artists sourced from Last.fm, deduplicated across selections
- Discovery badge on tracks from similar artists

### v0.3
- Auto-play on generation (starts first track, queues the rest)
- Fixed 403 error when saving playlists to Spotify
- Device fallback: targets an available Spotify device if none active

### v0.2
- Switched to Last.fm for artist track discovery
- Deep Cuts defined as Last.fm ranks 11–50 by scrobble count
- Dual artist search: Spotify + Last.fm results merged (later simplified to Spotify-only in v0.6)
- Optional Last.fm play count display per track
- Spotify track matching with exact artist name preference

### v0.1
- Initial build
- Spotify PKCE OAuth
- 3 artist slots with live search autocomplete
- Top Hits / Deep Cuts / Mix track modes
- Shuffled playlist generation
- Save to Spotify playlist + Add to Queue
- Configurable tracks per artist (1–10)

---

Built with [Claude](https://claude.ai) by Anthropic
