// ── Now-playing poll ──────────────────────────────────────────────────────────
const POLL_INTERVAL = 2000; // 2s — snappy enough to follow skips

function startPolling() {
  stopPolling();
  // Poll immediately on start, then on interval
  pollNowPlaying();
  pollTimer = setInterval(pollNowPlaying, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  // Reset index so next highlight always fires even if same track
  nowPlayingIndex = -1;
}

function buildUriMap() {
  const map = {};
  generatedTracks.forEach((t, i) => {
    if (!map[t.uri]) map[t.uri] = i;
  });
  return map;
}

let _uriMap = null;
let _uriMapGeneration = null;

async function pollNowPlaying() {
  try {
    const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    if (r.status === 204 || !r.ok) return;
    const data = await r.json();
    if (!data?.item) return;
    const uri = data.item.uri;

    // Rebuild map if generation changed (new mixtape or reshuffle)
    if (_uriMapGeneration !== generatedTracks) {
      _uriMap = buildUriMap();
      _uriMapGeneration = generatedTracks;
    }

    const idx = _uriMap[uri];
    if (idx !== undefined && idx !== nowPlayingIndex) {
      highlightNowPlaying(idx);
    }
  } catch { /* ignore poll errors */ }
}

function highlightNowPlaying(index) {
  // Remove previous highlight
  document.querySelectorAll('.track-item.now-playing').forEach(r => r.classList.remove('now-playing'));
  if (index >= 0) {
    const row = document.getElementById('track-' + index);
    if (row) {
      row.classList.add('now-playing');
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  nowPlayingIndex = index;
}

async function playFromTrack(i, silent = false) {
  const uris = generatedTracks.slice(i).map(t => t.uri);
  if (!uris.length) return;
  try {
    const ok = await spotifyPlay(uris);
    if (!ok) throw new Error('no active device');
    // Highlight immediately — don't wait for next poll tick
    highlightNowPlaying(i);
    startPolling();
    if (!silent) showToast(i === 0 ? `Playing ${generatedTracks.length} tracks` : `Playing from track ${i + 1}`);
  } catch {
    if (!silent) showError('Playback failed. Open Spotify on any device first, then try again.');
  }
}

async function autoPlay() {
  if (!generatedTracks.length) return;
  // Small delay to ensure DOM has rendered before we highlight track 0
  setTimeout(() => playFromTrack(0, true), 150);
}
