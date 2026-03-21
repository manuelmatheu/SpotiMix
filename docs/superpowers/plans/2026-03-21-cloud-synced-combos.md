# Cloud-Synced Combos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync saved artist combos to Supabase so they persist across devices, tied to the user's Spotify account.

**Architecture:** localStorage remains the primary read source. A new `js/supabase.js` module handles all cloud operations (fetch, upsert, merge+sync). The Supabase UMD client loads via `<script>` tag. Two touch points in `ui.js`: init flow calls `mergeAndSync()`, `persistCombos()` fires cloud upsert.

**Tech Stack:** Supabase JS v2 (UMD from CDN), existing vanilla JS globals

**Spec:** `docs/superpowers/specs/2026-03-21-cloud-synced-combos-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `js/config.js` | Modify | Add `SUPABASE_URL`, `SUPABASE_ANON`, `cloudSyncReady`, `syncInProgress` |
| `js/supabase.js` | Create | Supabase client init + `fetchCloudCombos`, `upsertCloudCombos`, `mergeAndSync` |
| `index.html` | Modify | Add Supabase UMD `<script>` tag + `js/supabase.js` in load order |
| `js/ui.js` | Modify | Add `mergeAndSync` call in both init branches + cloud upsert in `persistCombos` |

---

### Task 1: Add Supabase config to `config.js`

**Files:**
- Modify: `js/config.js:1-36`

- [ ] **Step 1: Add Supabase constants and state variables**

Add after line 3 (after `LASTFM_API_KEY`):

```js
const SUPABASE_URL  = 'https://mhzfuamvkbuwlyahaqna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oemZ1YW12a2J1d2x5YWhhcW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTg2MjIsImV4cCI6MjA4OTU5NDYyMn0.JHWCb_-vxvXQP7YCpjGhSVejo8vH2qWKUyOe8Tf8VaU';
```

Add after line 25 (after `savedCombos`):

```js
let cloudSyncReady = false;
let syncInProgress = false;
```

- [ ] **Step 2: Syntax check**

Run: `node -c js/config.js`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add js/config.js
git commit -m "Add Supabase config constants and sync state vars"
```

---

### Task 2: Add Supabase UMD script and `supabase.js` to `index.html`

**Files:**
- Modify: `index.html:381-386`

- [ ] **Step 1: Add Supabase CDN script and supabase.js to load order**

Replace the script block at lines 381-386:

```html
<script src="https://sdk.scdn.co/spotify-player.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="js/config.js"></script>
<script src="js/spotify.js"></script>
<script src="js/lastfm.js"></script>
<script src="js/supabase.js"></script>
<script src="js/player.js"></script>
<script src="js/ui.js"></script>
```

Load order: Supabase UMD first (sets `window.supabase`), then `config.js` (globals), then `supabase.js` (client init), then the rest.

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "Add Supabase UMD CDN script and supabase.js to load order"
```

---

### Task 3: Create `js/supabase.js`

**Files:**
- Create: `js/supabase.js`

- [ ] **Step 1: Write `supabase.js` with client init and three functions**

```js
// ── Supabase Cloud Sync ──────────────────────────────────────────────────────
// Syncs saved combos to Supabase. localStorage is the primary read source;
// Supabase is the background sync layer. All failures are silent.

let _sb = null; // Supabase client instance

// Init: create client at load time if UMD is available
(function initSupabase() {
  try {
    if (window.supabase && SUPABASE_URL && SUPABASE_ANON) {
      _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      cloudSyncReady = true;
    }
  } catch (e) {
    console.warn('Supabase init failed:', e);
  }
})();

async function fetchCloudCombos(spotifyId) {
  if (!cloudSyncReady || !spotifyId) return [];
  try {
    const { data, error } = await _sb
      .from('user_combos')
      .select('combos')
      .eq('spotify_id', spotifyId)
      .single();
    if (error || !data) return [];
    return Array.isArray(data.combos) ? data.combos : [];
  } catch (e) {
    console.warn('fetchCloudCombos failed:', e);
    return [];
  }
}

async function upsertCloudCombos(spotifyId, combos) {
  if (!cloudSyncReady || !spotifyId) return;
  try {
    const { error } = await _sb
      .from('user_combos')
      .upsert({
        spotify_id: spotifyId,
        combos: combos,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'spotify_id' });
    if (error) console.warn('upsertCloudCombos error:', error);
  } catch (e) {
    console.warn('upsertCloudCombos failed:', e);
  }
}

async function mergeAndSync(spotifyId, localCombos) {
  if (!cloudSyncReady || !spotifyId) return;
  syncInProgress = true;
  try {
    const cloudCombos = await fetchCloudCombos(spotifyId);

    // Build set of existing keys from local combos
    const seen = new Set(localCombos.map(c => comboKey(c)));
    const merged = [...localCombos];

    // Add cloud combos not already in local
    for (const c of cloudCombos) {
      const key = comboKey(c);
      if (!seen.has(key)) {
        merged.push(c);
        seen.add(key);
      }
    }

    // Update global state and persist
    savedCombos = merged;
    try { localStorage.setItem('mixtape_combos', JSON.stringify(savedCombos)); } catch {}
    renderCombos();

    // Push merged result to cloud
    await upsertCloudCombos(spotifyId, merged);
  } catch (e) {
    console.warn('mergeAndSync failed:', e);
  } finally {
    syncInProgress = false;
  }
}
```

- [ ] **Step 2: Syntax check**

Run: `node -c js/supabase.js`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add js/supabase.js
git commit -m "Add supabase.js: cloud sync for saved combos"
```

---

### Task 4: Add cloud upsert to `persistCombos()` in `ui.js`

**Files:**
- Modify: `js/ui.js:63-65`

- [ ] **Step 1: Update `persistCombos` to fire cloud upsert**

Replace `persistCombos` (line 63-65):

```js
function persistCombos() {
  try { localStorage.setItem('mixtape_combos', JSON.stringify(savedCombos)); } catch {}
  if (!syncInProgress && userId && cloudSyncReady) {
    upsertCloudCombos(userId, savedCombos).catch(() => {});
  }
}
```

- [ ] **Step 2: Syntax check**

Run: `node -c js/ui.js`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add js/ui.js
git commit -m "Add cloud upsert to persistCombos with sync guard"
```

---

### Task 5: Add `mergeAndSync` calls to `init()` in `ui.js`

**Files:**
- Modify: `js/ui.js:1213-1254` (the `init()` function)

- [ ] **Step 1: Add `mergeAndSync` after `userId` is set in both branches**

In the direct-auth branch (after line 1225 `userId = me.id;` and the UI setup), add after `renderAllSlots();` (line 1229):

```js
      mergeAndSync(userId, savedCombos);
```

In the token-refresh branch (after line 1238 `userId = me.id;` and the UI setup), add after `renderAllSlots();` (line 1242):

```js
          mergeAndSync(userId, savedCombos);
```

The resulting `init()` should look like:

```js
async function init() {
  loadCombos();
  renderCombos();

  const code = new URLSearchParams(window.location.search).get('code');
  if (code) await exchangeCode(code);
  else accessToken = localStorage.getItem('spotify_token');

  if (accessToken) {
    try {
      const me = await spGet('/me');
      userId = me.id;
      document.getElementById('username-label').textContent = me.display_name || me.id;
      document.getElementById('auth-section').classList.add('hidden');
      document.getElementById('app-section').classList.add('visible');
      renderAllSlots();
      mergeAndSync(userId, savedCombos);
      if (window.Spotify && !sdkPlayer) initSDKPlayer();
    } catch {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        try {
          const me = await spGet('/me');
          userId = me.id;
          document.getElementById('username-label').textContent = me.display_name || me.id;
          document.getElementById('auth-section').classList.add('hidden');
          document.getElementById('app-section').classList.add('visible');
          renderAllSlots();
          mergeAndSync(userId, savedCombos);
          if (window.Spotify && !sdkPlayer) initSDKPlayer();
        } catch {
          localStorage.removeItem('spotify_token');
          localStorage.removeItem('spotify_refresh');
          accessToken = null;
        }
      } else {
        localStorage.removeItem('spotify_token');
        accessToken = null;
      }
    }
  }
}
```

- [ ] **Step 2: Syntax check**

Run: `node -c js/ui.js`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add js/ui.js
git commit -m "Call mergeAndSync on login in both init branches"
```

---

### Task 6: Manual end-to-end verification

No files changed — this is a testing task.

- [ ] **Step 1: Verify Supabase UMD loads**

Open the app in a browser. Open DevTools console. Type `window.supabase` — should be defined (object with `createClient`).
Type `cloudSyncReady` — should be `true`.

- [ ] **Step 2: Verify first-time migration (local → cloud)**

If you have existing combos in localStorage, log in with Spotify. Check Supabase dashboard → Table Editor → `user_combos`. Your `spotify_id` should appear with your combos in the `combos` column.

- [ ] **Step 3: Verify save syncs to cloud**

Save a new combo (select 2+ artists, press S). Check Supabase dashboard — the new combo should appear in the `combos` JSONB array.

- [ ] **Step 4: Verify cross-device sync**

Open the app in a different browser or incognito (clear localStorage). Log in with the same Spotify account. Your saved combos should appear after login.

- [ ] **Step 5: Verify offline resilience**

Block the Supabase domain in DevTools (Network tab → block `mhzfuamvkbuwlyahaqna.supabase.co`). Save/remove combos. Verify no errors in console (just warnings), combos work normally from localStorage. Unblock and refresh — combos should sync.

- [ ] **Step 6: Final commit (if any fixes were needed)**

```bash
git add js/config.js js/supabase.js js/ui.js index.html
git commit -m "Phase 6: Cloud-Synced Combos via Supabase"
git push
```
