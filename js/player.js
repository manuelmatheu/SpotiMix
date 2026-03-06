// ── Now-playing poll ──────────────────────────────────────────────────────────
const POLL_INTERVAL = 4000;

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
    const uri = data.item.uri;

    // Build reverse URI→index map once per generation
    if (!pollNowPlaying._uriMap || pollNowPlaying._generation !== generatedTracks) {
      pollNowPlaying._uriMap = {};
      pollNowPlaying._generation = generatedTracks;
      generatedTracks.forEach((t, i) => {
        if (!pollNowPlaying._uriMap[t.uri]) pollNowPlaying._uriMap[t.uri] = i;
      });
    }

    const idx = pollNowPlaying._uriMap[uri];
    if (idx !== undefined) highlightNowPlaying(idx);
  } catch { /* ignore poll errors */ }
}

function highlightNowPlaying(index) {
  if (index === nowPlayingIndex) return;
  document.querySelectorAll('.track-item.now-playing').forEach(r => r.classList.remove('now-playing'));
  if (index >= 0) {
    const row = document.getElementById('track-' + index);
    if (row) { row.classList.add('now-playing'); row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }
  nowPlayingIndex = index;
}

async function playFromTrack(i, silent = false) {
  const uris = generatedTracks.slice(i).map(t => t.uri);
  if (!uris.length) return;
  try {
    const ok = await spotifyPlay(uris);
    if (!ok) throw new Error('no active device');
    highlightNowPlaying(i);
    startPolling();
    if (!silent) showToast(i === 0 ? `Playing ${generatedTracks.length} tracks` : `Playing from track ${i + 1}`);
  } catch {
    if (!silent) showError('Playback failed. Open Spotify on any device first, then try again.');
  }
}

async function autoPlay() {
  if (!generatedTracks.length) return;
  setTimeout(() => playFromTrack(0, true), 100);
}
