// ── Now-playing poll ──────────────────────────────────────────────────────────
const POLL_INTERVAL = 5000;

let sessionQueue  = new Set();
let sessionPaused = false;

function registerUri(uri, index) {
  if (!uriToIndices[uri]) uriToIndices[uri] = [];
  if (!uriToIndices[uri].includes(index)) uriToIndices[uri].push(index);
}

function buildUriMap() {
  uriToIndices = {};
  generatedTracks.forEach((t, i) => registerUri(t.uri, i));
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollNowPlaying, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  nowPlayingIndex = -1;
}

async function pollNowPlaying() {
  try {
    const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    if (r.status === 204 || !r.ok) return;
    const data = await r.json();
    if (!data?.item) return;

    const playingUri = data.item.uri;

    // Session check: is Spotify playing one of our queued tracks?
    if (sessionQueue.size > 0 && !sessionQueue.has(playingUri)) {
      if (!sessionPaused) {
        sessionPaused = true;
        highlightNowPlaying(-1);
      }
      return;
    }
    sessionPaused = false;

    // Update now-playing highlight using reverse map
    if (uriToIndices[playingUri]) {
      const candidates = uriToIndices[playingUri];
      let best = candidates[0];
      // Prefer the one closest to (and >=) the current highlight
      for (const idx of candidates) {
        if (idx >= nowPlayingIndex) { best = idx; break; }
      }
      highlightNowPlaying(best);
    }
  } catch { /* ignore transient errors */ }
}

function highlightNowPlaying(index) {
  if (index === nowPlayingIndex) return;
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
    if (!ok) throw new Error('no device');

    // Turn off repeat so the queue doesn't loop when finished
    try {
      await fetch('https://api.spotify.com/v1/me/player/repeat?state=off', {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + accessToken },
      });
    } catch { /* non-critical */ }

    // Build URI index map over the full list so polling can track any track
    buildUriMap();
    // sessionQueue only contains what we actually sent to Spotify
    sessionQueue  = new Set(uris);
    sessionPaused = false;

    highlightNowPlaying(i);
    startPolling();
    if (!silent) showToast(i === 0
      ? `Playing ${generatedTracks.length} tracks`
      : `Playing from track ${i + 1}`);
  } catch {
    if (!silent) showError('Playback failed. Open Spotify on any device first, then try again.');
  }
}

async function autoPlay() {
  if (!generatedTracks.length) return;
  setTimeout(() => playFromTrack(0, true), 150);
}
