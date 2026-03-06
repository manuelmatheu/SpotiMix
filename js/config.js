// ── Config ───────────────────────────────────────────────────────────────────
const SPOTIFY_CLIENT_ID = '73fce01f5762463e86ff6555751a148c';
const LASTFM_API_KEY    = '177b9e8ee70fe2325bfff606cfdaee23';
const REDIRECT_URI      = window.location.origin + window.location.pathname;
const SCOPES = [
  'user-read-private','user-read-email',
  'user-modify-playback-state',
  'playlist-modify-public','playlist-modify-private',
].join(' ');

// ── State ─────────────────────────────────────────────────────────────────────
let accessToken     = null;
let userId          = null;
let trackMode       = 'top';
let tracksPerArtist = 5;
let showMeta        = false;
let generatedTracks = [];
let rawTracks       = {};
let nowPlayingIndex = -1;
let pollTimer       = null;
const artists       = [null, null, null];
const searchTimers  = {};
