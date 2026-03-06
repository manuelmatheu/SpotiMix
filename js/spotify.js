// ── PKCE helpers ──────────────────────────────────────────────────────────────
function rndBytes(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
function b64url(buf) { return btoa(String.fromCharCode(...buf)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }
async function sha256(s) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); }

async function startAuth() {
  const verifier  = b64url(rndBytes(64));
  const challenge = b64url(new Uint8Array(await sha256(verifier)));
  sessionStorage.setItem('pkce_verifier', verifier);
  const p = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID, response_type: 'code',
    redirect_uri: REDIRECT_URI, code_challenge_method: 'S256',
    code_challenge: challenge, scope: SCOPES,
  });
  window.location = 'https://accounts.spotify.com/authorize?' + p;
}

async function exchangeCode(code) {
  const verifier = sessionStorage.getItem('pkce_verifier');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code,
      redirect_uri: REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID, code_verifier: verifier,
    }),
  });
  const d = await res.json();
  if (d.access_token) {
    accessToken = d.access_token;
    sessionStorage.setItem('spotify_token', accessToken);
    sessionStorage.removeItem('pkce_verifier');
    window.history.replaceState({}, '', REDIRECT_URI);
  }
}

function logout() {
  sessionStorage.removeItem('spotify_token');
  accessToken = null; userId = null;
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('app-section').classList.remove('visible');
}

// ── Spotify API ───────────────────────────────────────────────────────────────
async function spGet(path) {
  const r = await fetch('https://api.spotify.com/v1' + path, {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  if (r.status === 401) { logout(); throw new Error('Token expired'); }
  if (!r.ok) throw new Error('Spotify ' + r.status);
  return r.json();
}

async function spPost(path, body) {
  const r = await fetch('https://api.spotify.com/v1' + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Spotify POST ' + r.status);
  return r.json().catch(() => ({}));
}

async function getDevices() {
  try {
    const r = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    if (!r.ok) return [];
    return (await r.json()).devices || [];
  } catch { return []; }
}

async function transferPlayback(deviceId) {
  // Tell Spotify to make this device the active one
  await fetch('https://api.spotify.com/v1/me/player', {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  });
  // Give Spotify a moment to complete the transfer
  await new Promise(r => setTimeout(r, 800));
}

async function spotifyPlay(uris) {
  // Attempt 1: no device_id (works if a device is already active)
  let r = await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris }),
  });
  if (r.ok || r.status === 204) return true;

  // Attempt 2: find a device, transfer playback to it, then play
  const devices = await getDevices();
  if (!devices.length) return false;
  const device = devices.find(d => d.is_active) || devices.find(d => !d.is_restricted) || devices[0];

  // If no device is active, transfer to it first so Spotify is ready to accept play
  if (!device.is_active) await transferPlayback(device.id);

  r = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device.id}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris }),
  });
  return r.ok || r.status === 204;
}

async function addToQueue() {
  if (!generatedTracks.length) return;
  try {
    for (const t of generatedTracks) {
      await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(t.uri)}`, {
        method: 'POST', headers: { Authorization: 'Bearer ' + accessToken },
      });
    }
    showToast(`${generatedTracks.length} tracks added to queue`);
  } catch { showError('Could not add to queue. Make sure Spotify is open and playing.'); }
}

async function savePlaylist() {
  const name     = document.getElementById('playlist-name').value.trim() || 'My Mixtape';
  const desc     = document.getElementById('playlist-desc').value.trim();
  const isPublic = document.getElementById('playlist-public').checked;
  const saveBtn  = document.querySelector('#save-modal .btn-spotify');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  try {
    const uris = generatedTracks.map(t => t.uri);
    if (!uris.length) throw new Error('No tracks to save');

    // 1. Create the playlist
    const plRes = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc, public: isPublic }),
    });
    if (!plRes.ok) {
      const err = await plRes.json().catch(() => ({}));
      throw new Error(`Create playlist failed (${plRes.status}): ${err?.error?.message || 'unknown'}`);
    }
    const pl = await plRes.json();
    if (!pl.id) throw new Error('No playlist ID returned');

    // 2. Add tracks in batches of 100
    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      const addRes = await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: batch }),
      });
      if (!addRes.ok) {
        const err = await addRes.json().catch(() => ({}));
        throw new Error(`Adding tracks failed (${addRes.status}): ${err?.error?.message || 'unknown'}`);
      }
    }

    closeSaveModal();
    showToast(`"${name}" saved with ${uris.length} tracks!`);

    // Open the playlist in Spotify
    if (pl.external_urls?.spotify) {
      window.open(pl.external_urls.spotify, '_blank');
    }
  } catch (e) {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save to Spotify'; }
    if (e.message.includes('403') || e.message.includes('401')) {
      showError('Permission error — disconnect and reconnect Spotify.');
    } else {
      showError('Could not save: ' + e.message);
    }
  }
}
