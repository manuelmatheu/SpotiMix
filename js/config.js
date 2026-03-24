// ── Config ───────────────────────────────────────────────────────────────────
const SPOTIFY_CLIENT_ID = '73fce01f5762463e86ff6555751a148c';
const LASTFM_API_KEY    = '177b9e8ee70fe2325bfff606cfdaee23';
const SUPABASE_URL      = 'https://mhzfuamvkbuwlyahaqna.supabase.co';
const SUPABASE_ANON     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oemZ1YW12a2J1d2x5YWhhcW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTg2MjIsImV4cCI6MjA4OTU5NDYyMn0.JHWCb_-vxvXQP7YCpjGhSVejo8vH2qWKUyOe8Tf8VaU';
const REDIRECT_URI      = window.location.origin + window.location.pathname;
const SCOPES = [
  'user-read-private','user-read-email',
  'user-modify-playback-state','user-read-playback-state','user-read-currently-playing',
  'playlist-modify-public','playlist-modify-private',
  'streaming','user-library-modify','user-library-read',
].join(' ');

// ── State ─────────────────────────────────────────────────────────────────────
let accessToken     = null;
let userId          = null;
let userCountry     = 'US';
let trackMode       = 'top';
let tracksPerArtist = 5;
let generatedTracks = [];
let rawTracks       = {};
let nowPlayingIndex = -1;
let pollTimer       = null;
let uriToIndices    = {};
const artists       = [null, null, null];
const searchTimers  = {};
let savedCombos     = [];  // [{artists: [{name, image, sub},...]}]
let cloudSyncReady  = false;
let syncInProgress  = false;
let pendingSync     = false;
let tracksPerTag    = 5;   // Tag Mix: tracks fetched per tag
let currentMixLabel = '';  // Used for auto-naming saved playlists

// ── Heart SVGs (cross-platform, no font dependency) ───────────────────────────
const HEART_EMPTY  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>';
const HEART_FILLED = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>';

// ── SDK Player State ──────────────────────────────────────────────────────────
let sdkPlayer          = null;
let sdkDeviceId        = null;
let sdkReady           = false;
let sdkNeedsRetransfer = false; // set true when SDK reconnects after auth error
let progressRAF        = null;  // requestAnimationFrame id for progress bar
let lastSDKState       = null;  // last player_state_changed state
