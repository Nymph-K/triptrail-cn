/* TripTrail — a free travel map animator.
   Stack: MapLibre GL v5 (render, globe) + OpenFreeMap/VersaTiles/CARTO (tiles)
        + Nominatim (geocode) + OSRM (roads). No API keys. */

'use strict';

/* ----------------------------- i18n -----------------------------
   Every visible string lives here. `data-i18n*` attributes translate the
   static shell; runtime messages go through t(). The default is Chinese
   because this build targets Chinese users, but the top-right button
   switches the whole interface to English instantly. */
const I18N = window.TRIPTRAIL_I18N;

const PREFS = (() => {
  try { return JSON.parse(localStorage.getItem('triptrail.prefs') || '{}') || {}; } catch { return {}; }
})();
let LANG = PREFS.lang === 'en' ? 'en' : 'zh';

function t(key, vars) {
  const dict = I18N[LANG] || I18N.zh;
  let out = dict[key] ?? I18N.zh[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}
function savePrefs() {
  try {
    localStorage.setItem('triptrail.prefs', JSON.stringify({
      lang: LANG, region: settings.region, style: settings.style,
      cityLevel: settings.cityLevel, cities: settings.cities, borders: settings.borders,
      mediaInterval: settings.mediaInterval, mediaRatio: settings.mediaRatio,
      resourceRoot: settings.resourceRoot,
    }));
  } catch { /* private mode */ }
}

/* ----------------------------- Vector icons -----------------------------
   All glyphs are hand-drawn 24×24 stroke/fill primitives (no emoji anywhere).
   Same source is used for sidebar buttons (inline SVG) and the canvas
   compositor (rasterized via data-URL images, tinted per accent color). */
const ICONS = {
  plane: '<path fill="currentColor" stroke="currentColor" stroke-linejoin="round" stroke-width="1.2" d="M12 2 L12.9 3 12.9 9 20.5 13.4 20.5 15.2 12.9 12.8 12.9 17.6 15 19.2 15 20.8 12 19.9 9 20.8 9 19.2 11.1 17.6 11.1 12.8 3.5 15.2 3.5 13.4 11.1 9 11.1 3 Z"/>',
  car: '<path d="M5.4 10.8 6.8 6.9 C7 6.35 7.5 6 8.1 6 H15.9 C16.5 6 17 6.35 17.2 6.9 L18.6 10.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="3.4" y="10.8" width="17.2" height="5.2" rx="1.7" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="7.4" cy="17.3" r="1.8" fill="currentColor"/><circle cx="16.6" cy="17.3" r="1.8" fill="currentColor"/>',
  train: '<rect x="6" y="3" width="12" height="13" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="8.2" y="5.6" width="7.6" height="3.6" rx="1" fill="currentColor"/><circle cx="9.2" cy="12.9" r="1.25" fill="currentColor"/><circle cx="14.8" cy="12.9" r="1.25" fill="currentColor"/><path d="M8.5 16.5 6.6 20.4 M15.5 16.5 17.4 20.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  bus: '<rect x="4.2" y="3.5" width="15.6" height="13" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.2 9.6 H19.8" stroke="currentColor" stroke-width="1.8"/><path d="M7.2 13.2 H8.4 M15.6 13.2 H16.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="18.4" r="1.8" fill="currentColor"/><circle cx="16" cy="18.4" r="1.8" fill="currentColor"/>',
  boat: '<path d="M4 14.6 H20 L17.2 19 H6.8 Z" fill="currentColor"/><path d="M12 3 V14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12.9 4.4 C16.3 6 17.8 8.6 18 12.2 L12.9 12.2 Z" fill="currentColor"/><path d="M11.1 5.4 C8.7 7 7.7 9.4 7.5 12.2 L11.1 12.2 Z" fill="currentColor"/>',
  bike: '<circle cx="6" cy="16" r="3.6" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="18" cy="16" r="3.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6 16 10 8 15 8 18 16 M10 8 12.8 16 6 16 M15 8 14.2 6.2 M12.9 6.2 H15.5 M8.9 8 H11.1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  walk: '<circle cx="13" cy="4.4" r="2" fill="currentColor"/><path d="M13 7.4 12.2 12.2 9.4 20.6 M12.2 12.2 14.6 15 15 20.6 M12.8 8.4 9.6 10.8 M12.8 8.4 16.2 10.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  camper: '<path d="M3 15.4 V8.2 C3 7.3 3.7 6.6 4.6 6.6 H13.6 L20.6 11.2 C20.9 11.4 21 11.7 21 12 V15.4 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.6 6.6 V11.2 H20.6 M3 11.2 H13.6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="7.4" cy="16.9" r="1.8" fill="currentColor"/><circle cx="16.6" cy="16.9" r="1.8" fill="currentColor"/>',
  motorcycle: '<circle cx="5.6" cy="16.4" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="18.4" cy="16.4" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.6 16.4 9.6 12.6 H13.6 L16 9.4 H18.2 L18.4 16.4 M13.6 12.6 15.2 16.4 M9.4 9.4 H12.4 L13.6 12.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  tuktuk: '<path d="M4.6 15.2 V9.4 C4.6 6.9 6.6 5 9.1 5 H14.2 C15.1 5 15.9 5.5 16.3 6.3 L18.2 10 H19.4 C20 10 20.4 10.4 20.4 11 V15.2 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 5 V10 H18.2 M9.5 10 H4.6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="7.6" cy="16.9" r="1.8" fill="currentColor"/><circle cx="15.8" cy="16.9" r="1.8" fill="currentColor"/>',
  camera: '<path d="M4 7.6 H7.4 L9 5.6 H15 L16.6 7.6 H20 C20.66 7.6 21.2 8.14 21.2 8.8 V18 C21.2 18.66 20.66 19.2 20 19.2 H4 C3.34 19.2 2.8 18.66 2.8 18 V8.8 C2.8 8.14 3.34 7.6 4 7.6 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13.2" r="3.3" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  up: '<path d="M6 14.5 12 8.5 18 14.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  down: '<path d="M6 9.5 12 15.5 18 9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M7 7 17 17 M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  link: '<path d="M10.4 13.6a3.3 3.3 0 0 0 4.7 0l2.5-2.5a3.3 3.3 0 0 0-4.7-4.7l-1.2 1.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M13.6 10.4a3.3 3.3 0 0 0-4.7 0l-2.5 2.5a3.3 3.3 0 0 0 4.7 4.7l1.2-1.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  folder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v7.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  file: '<path d="M6 3.5h7l5 5v12H6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M13 3.5v5h5" fill="none" stroke="currentColor" stroke-width="1.7"/>',
};

function svgIcon(name) {
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

const iconCache = {};
// Rasterize at high resolution — icons are drawn up to ~100 device px
// (retina × cruise scale); downsampling from 256 keeps them crisp.
function iconImage(name, color, px = 256) {
  const key = `${name}|${color}`;
  if (iconCache[key]) return iconCache[key];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${px}" height="${px}">${ICONS[name].split('currentColor').join(color)}</svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  iconCache[key] = img;
  return img;
}
function preloadIcons(names, color) {
  return Promise.all(names.map(n => new Promise(res => {
    const im = iconImage(n, color);
    if (im.complete) res(); else { im.onload = res; im.onerror = res; }
  })));
}

/* ----------------------------- Transport modes -----------------------------
   route: how a realistic path is computed when "Real routes" is on —
   'osrm' follows the road network (rail corridors track it closely, so trains
   use it too, just with a longer range), 'sea' follows real shipping lanes,
   'air' always flies a great circle / arc. */
const MODES = {
  plane:      { label: 'Plane',        labelZh: '飞机',   dashed: true,  route: 'air',                bend: 0.18, directional: true },
  car:        { label: 'Car',          labelZh: '汽车',   dashed: false, route: 'osrm', maxKm: 1500,  bend: 0.07 },
  train:      { label: 'Train',        labelZh: '火车 / 高铁', dashed: true, route: 'osrm', maxKm: 3000,  bend: 0.05 },
  bus:        { label: 'Bus',          labelZh: '大巴',   dashed: false, route: 'osrm', maxKm: 1500,  bend: 0.07 },
  boat:       { label: 'Boat / Ferry', labelZh: '轮船 / 轮渡', dashed: true, route: 'sea',          bend: 0.14 },
  bike:       { label: 'Bike',         labelZh: '自行车', dashed: false, route: 'osrm', maxKm: 800,   bend: 0.05 },
  walk:       { label: 'Walk',         labelZh: '步行',   dashed: false, route: 'osrm', maxKm: 300,   bend: 0.04 },
  camper:     { label: 'Camper',       labelZh: '房车',   dashed: false, route: 'osrm', maxKm: 1500,  bend: 0.07 },
  motorcycle: { label: 'Motorcycle',   labelZh: '摩托车', dashed: false, route: 'osrm', maxKm: 1500,  bend: 0.07 },
  tuktuk:     { label: 'Tuk-tuk',      labelZh: '嘟嘟车', dashed: false, route: 'osrm', maxKm: 500,   bend: 0.07 },
};
function modeLabel(key) {
  const m = MODES[key];
  return m ? (LANG === 'zh' ? (m.labelZh || m.label) : m.label) : key;
}
const MODE_ALIASES = {
  plane: 'plane', flight: 'plane', fly: 'plane', airplane: 'plane', 飞机: 'plane',
  car: 'car', drive: 'car', driving: 'car', 汽车: 'car', 自驾: 'car',
  train: 'train', rail: 'train', 火车: 'train', 高铁: 'train', 新干线: 'train',
  bus: 'bus', coach: 'bus', 巴士: 'bus', 大巴: 'bus',
  boat: 'boat', ferry: 'boat', ship: 'boat', cruise: 'boat', 船: 'boat', 轮渡: 'boat',
  bike: 'bike', bicycle: 'bike', cycle: 'bike', cycling: 'bike', 单车: 'bike', 自行车: 'bike',
  walk: 'walk', walking: 'walk', hike: 'walk', foot: 'walk', 步行: 'walk', 徒步: 'walk',
  camper: 'camper', campervan: 'camper', rv: 'camper', 房车: 'camper',
  motorcycle: 'motorcycle', motorbike: 'motorcycle', moto: 'motorcycle', 摩托: 'motorcycle',
  tuktuk: 'tuktuk', 'tuk-tuk': 'tuktuk', rickshaw: 'tuktuk', 嘟嘟车: 'tuktuk',
};

/* ----------------------------- Demo journey ----------------------------- */
let stops = [
  { id: id(), name: '北京', nameZh: '北京', nameEn: 'Beijing', lng: 116.405285, lat: 39.904989, mode: 'train' },
  { id: id(), name: '西安', nameZh: '西安', nameEn: "Xi'an", lng: 108.948024, lat: 34.263161, mode: 'train' },
  { id: id(), name: '成都', nameZh: '成都', nameEn: 'Chengdu', lng: 104.065735, lat: 30.659462, mode: 'train' },
  { id: id(), name: '重庆', nameZh: '重庆', nameEn: 'Chongqing', lng: 106.504962, lat: 29.533155, mode: 'train' },
  { id: id(), name: '上海', nameZh: '上海', nameEn: 'Shanghai', lng: 121.472644, lat: 31.231706, mode: 'plane' },
];

function stopLabel(s) {
  if (!s) return '';
  if (LANG === 'en') return s.nameEn || s.name;
  return s.nameZh || s.name;
}

/* ----------------------------- Settings ----------------------------- */
const MEDIA_RATIOS = ['original', '3:2', '4:3', '16:9', '1:1', '3:4'];
const settings = {
  region: PREFS.region === 'global' ? 'global' : 'cn',
  style: PREFS.style || 'amap',
  aspect: '16:9',
  accent: '#ff5a3c',
  globe: false,
  pitch: false,
  labels: true,
  cities: PREFS.cities !== false,
  borders: PREFS.borders !== false,
  cityLevel: PREFS.cityLevel || 'auto',
  roads: true,
  glow: true,
  pace: 1,
  mediaInterval: clamp(Number(PREFS.mediaInterval) || 3, 1, 10),
  mediaRatio: MEDIA_RATIOS.includes(PREFS.mediaRatio) ? PREFS.mediaRatio : 'original',
  resourceRoot: typeof PREFS.resourceRoot === 'string' ? PREFS.resourceRoot : '',
  title: t('defaultTitle'),
  subtitle: t('defaultSubtitle'),
  watermark: '',
  format: 'mp4',      // mp4 | webm
  quality: 1,         // 1 | 2 (render pixel-ratio multiplier)
};

/* ----------------------------- Animation state ----------------------------- */
const anim = {
  playing: false,  recording: false,
  phase: 'idle',          // idle | intro | leg | pause | outro
  marker: null,           // [lng,lat]
  markerMode: 'plane',
  reached: 0,
  legIndex: -1,
  caption: '',
  titleAlpha: 0,
  photo: null,
  photoLabel: '',
  photoAlpha: 0,
  mediaStop: null,
  mediaElapsed: 0,
  mediaInterval: 3000,
  mediaCount: 0,
  mediaSlots: null,
  clockMs: 0,
  pulse: null,            // { lng, lat, start } arrival ripple
  fullCoords: [],
  legs: [],
};

let map, mediaRecorder, recordedChunks = [], cancelToken = 0;
let photoTargetId = null;
let basePixelRatio = window.devicePixelRatio || 1;

/* Local file bridge (see server.mjs). When the page is not served by the
   bundled server — e.g. a plain static host — the path features switch off and
   the app keeps the old behaviour of asking for the files again. */
const FS = {
  enabled: false,
  token: '',
  platform: 'win32',
  sep: '\\',
  home: '',
  roots: [],
};

/* China data: 3k+ offline places + simplified boundaries. */
const chinaData = { cities: [], pois: [], index: [], ready: false, failed: false };
const boundaryCache = {};
let placeRaf = 0;
let musicFileName = '';
let musicPath = '';
let musicSize = 0;
let lastVideo = null;
let activeMediaVideo = null;
let iconTargetId = null;
const CHINA_BOUNDS = [[73, 3], [136, 54]];
let customPlaces = (() => {
  try {
    const arr = JSON.parse(localStorage.getItem('triptrail.customPlaces') || '[]');
    return Array.isArray(arr)
      ? arr
        .filter(p => p && p.name && Number.isFinite(Number(p.lng)) && Number.isFinite(Number(p.lat)))
        .map(p => ({ id: p.id || id(), name: String(p.name), en: p.en || String(p.name), pinyin: p.pinyin || '', lng: Number(p.lng), lat: Number(p.lat), kind: 'custom' }))
      : [];
  } catch { return []; }
})();
let editingCustomId = null;

function saveCustomPlaces() {
  try { localStorage.setItem('triptrail.customPlaces', JSON.stringify(customPlaces)); } catch { /* private mode */ }
}

function rebuildPlaceIndex() {
  if (!chinaData.ready) return;
  chinaData.index = [
    ...chinaData.cities.map(p => ({ ...p, city: p.province })),
    ...chinaData.pois,
    ...customPlaces.map(p => ({ ...p, kind: 'custom', level: 4, en: p.en || p.name, pinyin: p.pinyin || '' })),
  ];
}

/* ============================================================ helpers */
function id() { return Math.random().toString(36).slice(2, 9); }
function $(s) { return document.querySelector(s); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

// rAF that degrades to setTimeout when the tab is hidden, so a recording
// never freezes forever if the user switches tabs mid-render.
function tick(fn) {
  if (document.hidden) { setTimeout(() => fn(performance.now()), 33); return; }
  requestAnimationFrame(fn);
}

function haversine(a, b) { // [lng,lat] -> km
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toR, dLng = (b[0] - a[0]) * toR;
  const la1 = a[1] * toR, la2 = b[1] * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}
function loading(on, text = t('working')) {
  $('#loading-text').textContent = text;
  $('#loading').classList.toggle('hidden', !on);
}

/* ============================================================ geometry */
// Shortest longitudinal delta, so routes never take the long way around the
// antimeridian (Tokyo → LA crosses the Pacific, not Eurasia).
function shortestDelta(fromLng, toLng) {
  let d = toLng - fromLng;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

// Great-circle interpolation (slerp on the unit sphere) — matches how real
// long-haul flights curve toward the poles.
function greatCircle(a, b, n = 96) {
  const toR = Math.PI / 180, toD = 180 / Math.PI;
  const vec = p => {
    const la = p[1] * toR, lo = p[0] * toR;
    return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  };
  const va = vec(a), vb = vec(b);
  const dot = clamp(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2], -1, 1);
  const om = Math.acos(dot);
  if (om < 1e-6) return [a.slice(), b.slice()];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s1 = Math.sin((1 - t) * om) / Math.sin(om), s2 = Math.sin(t * om) / Math.sin(om);
    const x = s1 * va[0] + s2 * vb[0], y = s1 * va[1] + s2 * vb[1], z = s1 * va[2] + s2 * vb[2];
    pts.push([Math.atan2(y, x) * toD, Math.atan2(z, Math.hypot(x, y)) * toD]);
  }
  // unwrap longitudes so the polyline is continuous across ±180
  pts[0][0] = a[0];
  for (let i = 1; i < pts.length; i++) {
    pts[i][0] = pts[i - 1][0] + shortestDelta(pts[i - 1][0], pts[i][0]);
  }
  // Damp toward the straight chord: pure geodesics on very long hops (e.g.
  // Hong Kong → Toronto) hug the pole and look wrong on a Mercator video —
  // blend keeps a natural poleward curve without the Arctic detour.
  const W = 0.45;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts[i][0] = pts[i][0] * (1 - W) + (a[0] + (b[0] - a[0]) * t) * W;
    pts[i][1] = pts[i][1] * (1 - W) + (a[1] + (b[1] - a[1]) * t) * W;
  }
  return pts;
}

// Fallback leg geometry: great circle for long hops, decorative bezier arc
// otherwise — always via the short side of the world.
function legCoords(A, B, m) {
  const b2 = [A[0] + shortestDelta(A[0], B[0]), B[1]];
  const dist = haversine(A, b2);
  if (dist > 1500) return greatCircle(A, b2);
  return arcLine(A, b2, m.bend);
}

/* ---- real shipping lanes (Eurostat SeaRoute marine network) ---- */
let seaNetPromise = null;
function loadSeaNet() {
  if (!seaNetPromise) {
    seaNetPromise = fetch('marnet.json')
      .catch(() => fetch('https://cdn.jsdelivr.net/npm/searoute-js@0.1.0/data/marnet_densified.json'))
      .then(r => r.json())
      .then(buildSeaGraph);
  }
  return seaNetPromise;
}

function buildSeaGraph(geojson) {
  const nodes = new Map();
  // merge ±180 so lanes connect across the antimeridian
  const normLng = l => { let x = ((l % 360) + 540) % 360 - 180; return x === 180 ? -180 : x; };
  const keyOf = c => `${normLng(c[0]).toFixed(3)},${c[1].toFixed(3)}`;
  const addNode = c => {
    const k = keyOf(c);
    if (!nodes.has(k)) nodes.set(k, { lng: normLng(c[0]), lat: c[1], adj: [] });
    return k;
  };
  for (const f of geojson.features) {
    const g = f.geometry;
    const lines = g.type === 'LineString' ? [g.coordinates] : (g.type === 'MultiLineString' ? g.coordinates : []);
    for (const ln of lines) {
      for (let i = 1; i < ln.length; i++) {
        const a = addNode(ln[i - 1]), b = addNode(ln[i]);
        if (a === b) continue;
        const w = haversine(ln[i - 1], ln[i]);
        nodes.get(a).adj.push({ k: b, w });
        nodes.get(b).adj.push({ k: a, w });
      }
    }
  }
  return nodes;
}

function nearestSeaNode(nodes, p) {
  let best = null, bd = Infinity;
  for (const [k, n] of nodes) {
    const d = haversine(p, [n.lng, n.lat]);
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

// Dijkstra over the shipping-lane graph with a small binary heap.
function seaDijkstra(nodes, src, dst) {
  const dist = new Map([[src, 0]]), prev = new Map(), done = new Set();
  const heap = [[0, src]];
  const swap = (i, j) => { const t = heap[i]; heap[i] = heap[j]; heap[j] = t; };
  const push = (item) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; swap(i, p); i = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break; swap(i, m); i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, k] = pop();
    if (k === dst) break;
    if (done.has(k)) continue;
    done.add(k);
    for (const e of nodes.get(k).adj) {
      const nd = d + e.w;
      if (nd < (dist.get(e.k) ?? Infinity)) { dist.set(e.k, nd); prev.set(e.k, k); push([nd, e.k]); }
    }
  }
  if (!prev.has(dst) && src !== dst) return null;
  const path = [dst];
  while (path[path.length - 1] !== src) path.push(prev.get(path[path.length - 1]));
  return path.reverse();
}

// Real sea route between two (possibly unwrapped) points, following global
// shipping lanes; longitudes come back unwrapped and anchored at A.
async function seaRoute(A, B) {
  const nodes = await loadSeaNet();
  const norm = l => ((l % 360) + 540) % 360 - 180;
  const a = [norm(A[0]), A[1]], b = [norm(B[0]), B[1]];
  const src = nearestSeaNode(nodes, a), dst = nearestSeaNode(nodes, b);
  if (!src || !dst) throw new Error('no sea nodes');
  const keys = seaDijkstra(nodes, src, dst);
  if (!keys) throw new Error('no sea path');
  const raw = keys.map(k => { const n = nodes.get(k); return [n.lng, n.lat]; });
  // stitch city → lane → city and unwrap for antimeridian continuity
  const pts = [[A[0], A[1]]];
  for (const c of raw) {
    const prevPt = pts[pts.length - 1];
    pts.push([prevPt[0] + shortestDelta(prevPt[0], c[0]), c[1]]);
  }
  const lastPt = pts[pts.length - 1];
  pts.push([lastPt[0] + shortestDelta(lastPt[0], norm(B[0])), B[1]]);
  return pts;
}

function arcLine(a, b, bend, n = 72) {
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const ctrl = [mid[0] - dy * bend, mid[1] + dx * bend];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([
      u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1],
    ]);
  }
  return pts;
}

async function osrmRoute(a, b) {
  const path = `${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`;
  const services = [
    `https://router.project-osrm.org/route/v1/driving/${path}`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${path}`,
  ];
  for (const url of services) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const j = await r.json();
      if (j.code === 'Ok' && j.routes && j.routes[0]) return j.routes[0].geometry.coordinates;
    } catch { /* try the next road service */ }
  }
  throw new Error('no road route');
}

function buildPath(coords) {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + haversine(coords[i - 1], coords[i]));
  return { coords, cum, total: cum[cum.length - 1] || 0.0001 };
}
function pointAt(path, frac) {
  const d = clamp(frac, 0, 1) * path.total;
  let i = 1;
  while (i < path.cum.length && path.cum[i] < d) i++;
  if (i >= path.cum.length) { const last = path.coords[path.coords.length - 1]; return { pos: last, idx: path.coords.length - 1 }; }
  const seg = path.cum[i] - path.cum[i - 1] || 1;
  const t = (d - path.cum[i - 1]) / seg;
  const a = path.coords[i - 1], b = path.coords[i];
  return { pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], idx: i };
}
function sliceTo(path, frac) {
  const { idx, pos } = pointAt(path, frac);
  return path.coords.slice(0, idx).concat([pos]);
}
function line(coords) { return { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } }; }
const EMPTY = { type: 'FeatureCollection', features: [] };

/* ============================================================ map setup */
// Free satellite imagery (Esri World Imagery) as a self-contained style spec.
const SATELLITE_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256, maxzoom: 18,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#06101f' } },
    { id: 'satellite', type: 'raster', source: 'satellite', paint: { 'raster-fade-duration': 0 } },
  ],
};

// Chinese-language raster basemaps. AMap's public raster endpoints give much
// better domestic city/road coverage (and Chinese labels) than the global
// styles. All four subdomains are listed because MapLibre has no {s} token.
const amapTiles = (kind) => (kind === 'satellite'
  ? [1, 2, 3, 4].map(n => `https://webst0${n}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}`)
  // ltype=3 = land + road network WITHOUT text labels. Our canvas city layer
  // then owns every label, which avoids doubled names and makes the selected
  // city tier genuinely authoritative.
  : [1, 2, 3, 4].map(n => `https://wprd0${n}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}&ltype=3`));
function amapStyle(kind) {
  return {
    version: 8,
    sources: {
      amap: {
        type: 'raster',
        tiles: amapTiles(kind),
        tileSize: 256,
        minzoom: 3,
        maxzoom: 18,
        attribution: kind === 'satellite' ? '影像 © 高德地图 / AMap' : '地图 © 高德地图 / AMap',
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#dfe8ef' } },
      { id: 'amap', type: 'raster', source: 'amap', paint: { 'raster-fade-duration': 0 } },
    ],
  };
}
const AMAP_ROAD_STYLE = amapStyle('road');
const AMAP_SAT_STYLE = amapStyle('satellite');
const CHINA_STYLE_IDS = new Set(['amap', 'amap-satellite']);
const isChinaStyle = value => CHINA_STYLE_IDS.has(value);

// Resolve a style menu value to a URL or an inline spec.
function styleSpec(value) {
  if (value === 'satellite') return SATELLITE_STYLE;
  if (value === 'amap') return AMAP_ROAD_STYLE;
  if (value === 'amap-satellite') return AMAP_SAT_STYLE;
  return value;
}

function initMap() {
  const initial = styleSpec(settings.style);
  const inline = typeof initial !== 'string';
  map = new maplibregl.Map({
    container: 'map',
    // An inline style object passed to the constructor can silently fail to
    // fire `load` in this build, so start from a trivial style that always
    // loads and swap to the real one below.
    style: inline ? { version: 8, sources: {}, layers: [] } : initial,
    center: settings.region === 'cn' ? [104.2, 35.6] : [5, 44],
    zoom: settings.region === 'cn' ? 4.05 : 4,
    pitch: settings.pitch ? 50 : 0,
    preserveDrawingBuffer: true,   // needed so recording can drawImage the map
    attributionControl: { compact: true },
    maxTileCacheSize: 4096,   // keep prewarmed route tiles in memory
    maxBounds: settings.region === 'cn' ? CHINA_BOUNDS : undefined,
    minZoom: settings.region === 'cn' ? 2.8 : 0,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  // style.load fires for every style (initial + each switch) — always (re)add
  // our layers; if the style reports "not done loading", retry on styledata.
  const ensureLayers = () => {
    try {
      applyProjection();
      addLayers();
      refreshRoutePreview();
      ensureChinaOverlay();
      schedulePlaceLayer();
    } catch (e) { map.once('styledata', ensureLayers); }
  };
  map.on('style.load', () => { ensureLayers(); if (stops.length) fitToStops(true); });
  map.on('click', (e) => { if (!anim.playing) addStopAt(e.lngLat.lng, e.lngLat.lat); });
  map.on('render', () => { if (!anim.playing) schedulePlaceLayer(); });
  map.on('resize', schedulePlaceLayer);
  // diff:false forces a full (re)load so style.load fires and our layers re-add
  if (inline) map.once('load', () => map.setStyle(initial, { diff: false }));
}

function applyProjection() {
  try { map.setProjection({ type: settings.globe ? 'globe' : 'mercator' }); } catch (e) { /* older browsers */ }
  applySky();
}

// Subtle atmosphere so the globe (and tilted views) read as a lit planet.
function applySky() {
  try {
    if (!map.setSky) return;
    map.setSky({
      'sky-color': '#0a1626',
      'horizon-color': '#16324c',
      'fog-color': '#0e1116',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.5,
      'fog-ground-blend': 0.4,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.9, 4, 0.5, 6, 0.2, 8, 0],
    });
  } catch (e) { /* sky unsupported on this build */ }
}

// Resolves when the current viewport's tiles are in (or after a timeout).
function waitForTiles(timeoutMs = 5000) {
  return new Promise(resolve => {
    if (map.areTilesLoaded() && map.loaded()) return resolve();
    let t = setTimeout(done, timeoutMs);
    function check() { if (map.areTilesLoaded()) done(); }
    function done() {
      clearTimeout(t);
      map.off('sourcedata', check); map.off('idle', done);
      resolve();
    }
    map.on('sourcedata', check);
    map.on('idle', done);
  });
}

// Route layers. The full journey lives in ONE `trail` source (set once) and is
// revealed with a line-gradient — no per-frame geometry updates, which is the
// key to flicker-free playback. Three stacked layers give a glowing path.
const TRAIL_LAYERS = ['trail-glow', 'trail-casing', 'trail-core'];
function addLayers() {
  const a = settings.accent;
  if (!map.getSource('route-bg')) map.addSource('route-bg', { type: 'geojson', data: EMPTY });
  if (!map.getSource('trail')) map.addSource('trail', { type: 'geojson', data: EMPTY, lineMetrics: true });

  const ensure = (lid, def) => { if (!map.getLayer(lid)) map.addLayer(def); };

  // faint dashed plan of the whole route (edit mode only)
  ensure('route-bg', { id: 'route-bg', type: 'line', source: 'route-bg',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#9aa6b2', 'line-width': 2, 'line-opacity': 0.28, 'line-dasharray': [1.5, 2.5] } });

  if (settings.glow)
    ensure('trail-glow', { id: 'trail-glow', type: 'line', source: 'trail',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': a, 'line-width': 14, 'line-opacity': 0.32, 'line-blur': 5 } });
  ensure('trail-casing', { id: 'trail-casing', type: 'line', source: 'trail',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': a, 'line-opacity': 0.5, 'line-width': 7.2, 'line-blur': 1.4 } });
  ensure('trail-core', { id: 'trail-core', type: 'line', source: 'trail',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': a, 'line-opacity': 1, 'line-width': 4.2 } });

  applySky();
  ensureChinaOverlay();
}

/* ---------------------- Simplified China boundary overlay ---------------------- */
async function loadBoundary(key, url) {
  if (!boundaryCache[key]) {
    boundaryCache[key] = fetch(url)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .catch(e => { console.warn(`boundary ${key} failed:`, e); return EMPTY; });
  }
  return boundaryCache[key];
}

let boundaryBusy = false;
async function ensureChinaOverlay() {
  if (!map || settings.region !== 'cn' || boundaryBusy) {
    setBoundaryVisibility();
    return;
  }
  boundaryBusy = true;
  try {
    const [province, prefecture, district] = await Promise.all([
      loadBoundary('provinces', 'data/china-provinces.geojson'),
      loadBoundary('prefectures', 'data/china-prefectures.geojson'),
      loadBoundary('districts', 'data/china-districts.geojson'),
    ]);
    if (!map || !map.getStyle()) return;
    const addSrc = (id, data) => { if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data }); };
    addSrc('china-provinces', province);
    addSrc('china-prefectures', prefecture);
    addSrc('china-districts', district);
    const before = map.getLayer('route-bg') ? 'route-bg' : undefined;
    const ensure = (def) => { if (!map.getLayer(def.id)) map.addLayer(def, before); };
    ensure({ id: 'china-fill', type: 'fill', source: 'china-provinces',
      paint: { 'fill-color': '#2f6f9f', 'fill-opacity': 0.025 } });
    ensure({ id: 'china-province-line', type: 'line', source: 'china-provinces',
      paint: {
        'line-color': '#2f6f9f', 'line-opacity': 0.62,
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 5, 1.3, 8, 2.1],
      } });
    ensure({ id: 'china-prefecture-line', type: 'line', source: 'china-prefectures', minzoom: 5.3,
      paint: {
        'line-color': '#4d7f9e', 'line-opacity': 0.36,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5.3, 0.4, 8, 0.9, 12, 1.4],
      } });
    ensure({ id: 'china-district-line', type: 'line', source: 'china-districts', minzoom: 8.5,
      paint: { 'line-color': '#f4f7fa', 'line-opacity': 0.32, 'line-width': 0.65 } });
  } finally {
    boundaryBusy = false;
    setBoundaryVisibility();
  }
}

function setBoundaryVisibility() {
  if (!map || !map.getLayer) return;
  const visible = settings.region === 'cn' && settings.borders;
  for (const id of ['china-fill', 'china-province-line', 'china-prefecture-line', 'china-district-line']) {
    try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); }
    catch { /* style switching */ }
  }
}

// Border lines must sit below the animated route; MapLibre's beforeId keeps
// that order even when the user changes basemaps.
function setSrc(sid, data) { const s = map.getSource(sid); if (s) s.setData(data); }

// Reveal the trail up to `progress` (0..1 of total length) via a gradient step.
function setTrailReveal(progress) {
  const p = clamp(progress, 0.0001, 1);
  const grad = ['step', ['line-progress'], settings.accent, p, 'rgba(0,0,0,0)'];
  for (const id of TRAIL_LAYERS) {
    try { if (map.getLayer(id)) map.setPaintProperty(id, 'line-gradient', grad); } catch (e) { /* layer not ready */ }
  }
}

function refreshRoutePreview() {
  if (!map || !map.getSource('route-bg')) return;
  const feats = [];
  for (let i = 1; i < stops.length; i++) {
    const m = MODES[stops[i].mode] || MODES.plane;
    feats.push(line(legCoords([stops[i - 1].lng, stops[i - 1].lat], [stops[i].lng, stops[i].lat], m)));
  }
  setSrc('route-bg', { type: 'FeatureCollection', features: feats });
}

// Padding that never exceeds what the canvas can absorb (small preview panes).
function fitPadding(want) {
  const c = map.getCanvas();
  const cap = Math.floor(Math.min(c.clientWidth, c.clientHeight) * 0.18);
  return clamp(Math.min(want, cap), 12, 140);
}

// Stop coordinates with longitudes unwrapped along travel order, so bounds
// around a dateline-crossing trip frame the short side of the world.
function unwrappedStops() {
  if (!stops.length) return [];
  let lng = stops[0].lng;
  const out = [[lng, stops[0].lat]];
  for (let i = 1; i < stops.length; i++) {
    lng += shortestDelta(lng, stops[i].lng);
    out.push([lng, stops[i].lat]);
  }
  return out;
}

function fitToStops(instant) {
  if (!map || stops.length === 0) return;
  if (stops.length === 1) { map.jumpTo({ center: [stops[0].lng, stops[0].lat], zoom: 8 }); return; }
  const b = new maplibregl.LngLatBounds();
  unwrappedStops().forEach(c => b.extend(c));
  map.fitBounds(b, { padding: fitPadding(90), duration: instant ? 0 : 700, pitch: settings.pitch ? 50 : 0 });
}

/* ============================================================ map labels
   City labels are painted with Canvas 2D instead of MapLibre symbol layers:
   system CJK fonts are always available (no huge glyph PBF download), and
   the same routine can be replayed inside the export canvas. Waypoints are
   drawn after the city layer, so they can never be hidden by a label. */
function cityMinZoom(c) {
  if (settings.cityLevel === 'auto') {
    if (c.level === 1) return 3.0;
    if (c.level === 2) return c.pop > 4_000_000 ? 4.35 : c.pop > 1_500_000 ? 4.9 : 5.5;
    return 8.1;
  }
  const maxLevel = Number(settings.cityLevel) || 3;
  if (c.level > maxLevel) return Infinity;
  return c.level === 1 ? 2.8 : c.level === 2 ? 4.4 : 7.0;
}

function drawCityLabels(ctx, W, H, dpr) {
  if (settings.region !== 'cn' || !settings.cities || !chinaData.ready) return;
  const zoom = map.getZoom();
  const view = map.getBounds();
  const candidates = chinaData.cities
    .filter(c => c.lng >= 72 && c.lng <= 137 && c.lat >= 2 && c.lat <= 55)
    .filter(c => view.contains([c.lng, c.lat]))
    .filter(c => zoom >= cityMinZoom(c))
    .sort((a, b) => a.level - b.level || (b.pop || 0) - (a.pop || 0));
  const placed = [];
  let count = 0;
  for (const c of candidates) {
    if (count >= 110) break;
    if (occludedByGlobe(c.lng, c.lat)) continue;
    const [x, y] = project(c.lng, c.lat, dpr);
    if (x < -80 || x > W + 80 || y < -30 || y > H + 30) continue;
    const tier = c.level === 1 ? 1 : c.level === 2 ? 2 : 3;
    const fs = (tier === 1 ? 13 : tier === 2 ? 12 : 10.5) * dpr;
    const weight = tier === 1 ? 700 : tier === 2 ? 600 : 500;
    const font = `${weight} ${fs}px "Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif`;
    ctx.font = font;
    const name = LANG === 'en' ? (c.en || c.name) : c.name;
    const tw = ctx.measureText(name).width;
    const right = x < W - tw - 28 * dpr;
    const lx = right ? x + 9 * dpr : x - 9 * dpr - tw;
    const box = { x: lx - 4 * dpr, y: y - fs * 0.72, w: tw + 8 * dpr, h: fs * 1.44 };
    if (placed.some(b => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y)) continue;
    placed.push(box);
    // dot
    ctx.beginPath();
    ctx.arc(x, y, (tier === 1 ? 3.1 : 2.2) * dpr, 0, Math.PI * 2);
    ctx.fillStyle = tier === 1 ? settings.accent : 'rgba(245,249,252,.92)';
    ctx.fill();
    if (tier === 1) {
      ctx.beginPath();
      ctx.arc(x, y, 6 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(settings.accent, 0.55);
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();
    }
    // text with a dark halo for legibility on both AMap and satellite
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineWidth = 3.2 * dpr;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(5,10,16,.88)';
    ctx.strokeText(name, lx, y + 0.5 * dpr);
    ctx.fillStyle = tier === 1 ? '#ffffff' : tier === 2 ? '#eaf0f6' : '#d6e0e9';
    ctx.fillText(name, lx, y + 0.5 * dpr);
    count++;
  }
}

function drawWaypoints(ctx, W, H, dpr) {
  stops.forEach((st, i) => {
    if (occludedByGlobe(st.lng, st.lat)) return;
    const [x, y] = project(st.lng, st.lat, dpr);
    if (x < -50 || x > W + 50 || y < -50 || y > H + 50) return;
    ctx.beginPath(); ctx.arc(x, y, 7 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = settings.accent;
    ctx.fill();
    ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 12 * dpr, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(settings.accent, 0.45); ctx.lineWidth = 2 * dpr; ctx.stroke();
    if (settings.labels) {
      const label = stopLabel(st);
      const fs = 15 * dpr;
      ctx.font = `700 ${fs}px "Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif`;
      const tw = ctx.measureText(label).width;
      const px = 9 * dpr, py = 6 * dpr, lx = x + 13 * dpr, ly = y - fs - 4 * dpr;
      roundRect(ctx, lx, ly, tw + px * 2, fs + py * 2, 7 * dpr);
      ctx.fillStyle = 'rgba(12,16,21,.86)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(label, lx + px, ly + (fs + py * 2) / 2);
    }
  });
}

function drawMapLabels(ctx, W, H, dpr) {
  drawCityLabels(ctx, W, H, dpr);
  drawWaypoints(ctx, W, H, dpr);
}

function schedulePlaceLayer() {
  if (!map || anim.playing || placeRaf) return;
  placeRaf = requestAnimationFrame(() => { placeRaf = 0; drawPlaceLayer(); });
}

function drawPlaceLayer() {
  const canvas = $('#place-layer');
  if (!canvas || !map) return;
  const m = map.getCanvas();
  if (!m || !m.width || !m.height) return;
  if (canvas.width !== m.width || canvas.height !== m.height) {
    canvas.width = m.width;
    canvas.height = m.height;
  }
  const ctx = canvas.getContext('2d');
  const dpr = m.width / m.clientWidth || 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMapLabels(ctx, canvas.width, canvas.height, dpr);
}

/* ============================================================ stop media
   Each stop owns a stack of media items. Images/GIFs are drawn from decoded
   frames; videos and Live Photos are played through hidden <video> elements
   and painted onto the same canvas as the map overlays. */

function mediaKindLabel(kind) {
  if (kind === 'gif') return t('kindGif');
  if (kind === 'video') return t('kindVideo');
  if (kind === 'live') return t('kindLive');
  return t('kindImage');
}
function mediaThumbSrc(m) {
  return (m && (m.poster || ((m.kind === 'image' || m.kind === 'gif') ? m.src : ''))) || '';
}

function fileBaseName(name) {
  return String(name || '').replace(/\.[^.]+$/, '').toLowerCase();
}
function isGifFile(file) {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name);
}
function isHeicFile(file) {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}
function isImageFile(file) {
  return /^image\//i.test(file.type) || /\.(png|jpe?g|webp|gif|avif|bmp|svg)$/i.test(file.name);
}
function isVideoFile(file) {
  return /^video\//i.test(file.type) || /\.(mp4|m4v|mov|webm|ogv)$/i.test(file.name);
}

async function decodeGifFrames(file) {
  if (typeof ImageDecoder === 'undefined') return null;
  try {
    const type = file.type === 'image/gif' ? file.type : 'image/gif';
    const decoder = new ImageDecoder({ data: await file.arrayBuffer(), type });
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    const count = track.frameCount || 0;
    if (!count || count > 600) { decoder.close(); return null; }
    const step = Math.max(1, Math.ceil(count / 120));
    const frames = [];
    let total = 0, bucket = 0, nextSample = 0;
    for (let i = 0; i < count; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      let dur = (image.duration || 0) / 1000;
      if (!dur || dur < 10) dur = 100;
      total += dur;
      bucket += dur;
      if (i >= nextSample) {
        const bitmap = await createImageBitmap(image);
        frames.push({ bitmap, duration: bucket });
        bucket = 0;
        nextSample = i + step;
      }
      image.close();
    }
    if (bucket && frames.length) frames[frames.length - 1].duration += bucket;
    decoder.close();
    if (!frames.length) return null;
    return { frames, total: Math.max(100, total) };
  } catch (e) {
    console.warn('GIF decode failed, using animated image fallback:', e);
    return null;
  }
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function imageMediaFromSrc(src, name, { gifBlob = null } = {}) {
  const img = await loadImageElement(src);
  const media = {
    id: id(), kind: gifBlob ? 'gif' : 'image', name,
    src, objectUrl: '', img,
    width: img.naturalWidth || 1200, height: img.naturalHeight || 800,
    duration: 0, path: '', size: 0,
  };
  if (gifBlob) {
    const decoded = await decodeGifFrames(gifBlob);
    if (decoded) {
      media.frames = decoded.frames;
      media.totalDuration = decoded.total;
    }
  }
  return media;
}

async function imageMediaFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const media = await imageMediaFromSrc(url, file.name, { gifBlob: isGifFile(file) ? file : null });
    media.objectUrl = url;
    media.size = file.size;
    return media;
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function waitForVideo(video, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = err => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      video.removeEventListener('loadedmetadata', ok);
      video.removeEventListener('error', bad);
      if (err) reject(err); else resolve();
    };
    const ok = () => finish();
    const bad = () => finish(new Error('video decode failed'));
    const timer = setTimeout(() => finish(new Error('video timeout')), timeoutMs);
    video.addEventListener('loadedmetadata', ok);
    video.addEventListener('error', bad);
    video.load();
  });
}

async function videoPoster(video) {
  try {
    if (video.readyState < 2) {
      await new Promise(res => {
        const done = () => { video.removeEventListener('loadeddata', done); res(); };
        video.addEventListener('loadeddata', done);
        setTimeout(done, 1500);
      });
    }
    const w = 480;
    const h = Math.max(1, Math.round(w * (video.videoHeight || 9) / (video.videoWidth || 16)));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(video, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.82);
  } catch { return ''; }
}

async function imagePosterFrom(url) {
  const img = await loadImageElement(url);
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = Math.max(1, Math.round(480 * (img.naturalHeight || 9) / Math.max(1, img.naturalWidth || 16)));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.84);
}

// Shared loader for files picked in the dialog and files restored from an
// absolute path: both end up as a hidden <video> the canvas can paint.
async function videoMediaFrom({ url, name, kind, posterFile = null, posterUrl = '', size = 0 }) {
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.preload = 'auto';
  video.loop = false;
  document.querySelector('#media-bin').appendChild(video);
  try {
    await waitForVideo(video);
    let duration = Number.isFinite(video.duration) ? video.duration * 1000 : 3000;
    if (!duration || duration < 100) duration = 3000;
    let poster = await videoPoster(video);
    if (posterFile) {
      const pu = URL.createObjectURL(posterFile);
      try { poster = await imagePosterFrom(pu); } catch { /* use video frame */ }
      URL.revokeObjectURL(pu);
    } else if (posterUrl) {
      try { poster = await imagePosterFrom(posterUrl); } catch { /* use video frame */ }
    }
    return {
      id: id(), kind, name, src: url, objectUrl: '',
      video, poster, posterImg: (() => { const im = new Image(); im.src = poster; return im; })(),
      width: video.videoWidth || 1280, height: video.videoHeight || 720,
      duration, path: '', size,
    };
  } catch (e) {
    video.pause();
    video.remove();
    throw e;
  }
}

async function videoMediaFromFile(file, kind, posterFile) {
  const url = URL.createObjectURL(file);
  try {
    const media = await videoMediaFrom({ url, name: file.name, kind, posterFile, size: file.size });
    media.objectUrl = url;
    return media;
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

async function addMediaFiles(stop, files) {
  if (!stop || !files.length) return;
  loading(true, t('mediaLoading'));
  const groups = new Map();
  for (const f of files) {
    const key = fileBaseName(f.name) || `file-${groups.size}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  const added = [];
  let skipped = 0;
  try {
    for (const group of groups.values()) {
      const images = group.filter(f => isImageFile(f) && !isHeicFile(f));
      const heic = group.some(isHeicFile);
      const video = group.find(isVideoFile);
      const wantedLive = !!video && !!(images.length || heic);
      if (video) {
        try {
          added.push(await videoMediaFromFile(video, wantedLive ? 'live' : 'video', images[0] || null));
          for (const img of images.slice(1)) added.push(await imageMediaFromFile(img));
        } catch (e) {
          console.warn('video media load failed, falling back to images:', e);
          for (const img of images) {
            try { added.push(await imageMediaFromFile(img)); } catch { skipped++; }
          }
          if (!images.length) skipped++;
        }
      } else {
        for (const img of images) {
          try { added.push(await imageMediaFromFile(img)); } catch { skipped++; }
        }
      }
      if (!video && !images.length) skipped++;
    }
  } finally {
    loading(false);
  }
  if (!added.length) {
    toast(t('mediaUnsupported', { n: skipped }), 4200);
    if (files.some(isHeicFile)) toast(t('mediaHeicUnsupported'), 5200);
    return;
  }
  bindPathsForAddedFiles(added, files);
  if (FS.enabled) await verifyMediaPaths(added);
  stop.media = [...(stop.media || []), ...added];
  renderStops();
  updatePathStatus();
  toast(t('mediaAdded', { n: added.length }));
  if (skipped) toast(t('mediaUnsupported', { n: skipped }), 4200);
  if (added.some(m => m.kind === 'video' || m.kind === 'live')) toast(t('videoRealtimeExport'), 4200);
}

// Remember where each picked file lives so the config can link to it. The
// browser never exposes a path, so the link is derived from the resource
// folder the user chose (plus the folder-relative name for directory picks).
function bindPathsForAddedFiles(added, files) {
  if (!settings.resourceRoot) return;
  const byName = new Map();
  for (const f of files) byName.set(f.name, f);
  for (const m of added) {
    const f = byName.get(m.name);
    if (!f) continue;
    m.size = m.size || f.size || 0;
    const rel = f.webkitRelativePath || f.name;
    const guess = fsJoin(settings.resourceRoot, rel);
    if (guess) m.path = guess;
  }
}

async function verifyMediaPaths(items) {
  await Promise.all(items.filter(m => m.path).map(async m => {
    const st = await fsStat(m.path);
    if (!st || !st.exists || !st.isFile) { m.path = ''; return; }
    if (st.size && m.size && Math.abs(st.size - m.size) > 2) { m.path = ''; return; }
    m.size = st.size || m.size || 0;
  }));
}

// Rebuild a media card from an absolute path recorded in the config.
async function mediaFromPath(entry) {
  const p = String((entry && entry.path) || '');
  if (!p || !FS.enabled) return null;
  const st = await fsStat(p);
  if (!st || !st.exists || !st.isFile) return null;
  const url = fsFileUrl(p);
  const name = entry.name || pathBaseName(p);
  const kind = ['image', 'gif', 'video', 'live'].includes(entry.kind) ? entry.kind : 'image';
  if (kind === 'image' || kind === 'gif') {
    let blob = null;
    if (kind === 'gif') {
      try {
        const r = await fetch(url);
        if (r.ok) blob = await r.blob();
      } catch { /* fall back to the animated <img> */ }
    }
    const media = await imageMediaFromSrc(url, name, { gifBlob: kind === 'gif' ? blob : null });
    media.kind = kind;
    media.path = p;
    media.size = st.size || 0;
    return media;
  }
  const media = await videoMediaFrom({
    url, name, kind,
    posterUrl: entry.posterPath ? fsFileUrl(entry.posterPath) : '',
    size: st.size || 0,
  });
  media.path = p;
  media.posterPath = entry.posterPath || '';
  return media;
}

function disposeMedia(media) {
  if (!media) return;
  try { if (media.video) { media.video.pause(); media.video.removeAttribute('src'); media.video.load(); media.video.remove(); } } catch { /* ignore */ }
  try { if (media.objectUrl) URL.revokeObjectURL(media.objectUrl); } catch { /* ignore */ }
  for (const f of media.frames || []) { try { f.bitmap.close(); } catch { /* ignore */ } }
  if (activeMediaVideo === media) activeMediaVideo = null;
}

function disposeStopMedia(stop) {
  for (const m of (stop && stop.media) || []) disposeMedia(m);
  if (stop) stop.media = [];
}

function disposeAllMedia() {
  pauseMediaVideos();
  for (const s of stops) disposeStopMedia(s);
}

function removeStopMedia(stopId, mediaId) {
  const stop = stops.find(s => s.id === stopId);
  if (!stop) return;
  const m = (stop.media || []).find(x => x.id === mediaId);
  if (m) disposeMedia(m);
  stop.media = (stop.media || []).filter(x => x.id !== mediaId);
  renderStops();
  toast(t('mediaRemoved'));
}

function mediaIntervalMs(stop) {
  const sec = Number(stop && stop.mediaInterval) || Number(settings.mediaInterval) || 3;
  return clamp(Math.round(sec * 1000), 800, 15000);
}

function mediaPlayDurationMs(media) {
  if (!media) return 0;
  if (media.kind === 'gif') {
    return media.totalDuration || (media.frames || []).reduce((s, f) => s + f.duration, 0) || 0;
  }
  if (media.kind === 'video' || media.kind === 'live') return media.duration || 0;
  return 0;
}

// Each card owns a time slot. Static images use the configured interval. A
// dynamic item gets at least its own full playback time, plus room for the
// slide-to-back transition, so a video/GIF is never cut off mid-play.
function mediaTimingFor(stop) {
  const interval = mediaIntervalMs(stop);
  const transition = clamp(Math.round(interval * 0.22), 160, 720);
  return (stop.media || []).map(m => {
    const dynamic = m.kind === 'gif' || m.kind === 'video' || m.kind === 'live';
    const play = dynamic ? mediaPlayDurationMs(m) : 0;
    const duration = dynamic ? Math.max(interval, play + transition) : interval;
    return { duration, transition: Math.min(transition, Math.round(duration * 0.4)) };
  });
}

function pauseMediaVideos() {
  if (activeMediaVideo && activeMediaVideo.video) {
    try { activeMediaVideo.video.pause(); } catch { /* ignore */ }
  }
  activeMediaVideo = null;
}

function activateMediaVideo(media) {
  if (!media || !media.video) return;
  if (activeMediaVideo === media) {
    if (media.video.paused && media.video.ended) return;
    if (media.video.paused) media.video.play().catch(() => {});
    return;
  }
  if (activeMediaVideo && activeMediaVideo.video) activeMediaVideo.video.pause();
  activeMediaVideo = media;
  try {
    media.video.currentTime = 0;
    media.video.play().catch(() => {});
  } catch { /* autoplay blocked until the next click */ }
}

function gifFrameAt(media, timeMs, loop = false) {
  if (!media.frames || !media.frames.length) return media.img;
  const total = media.totalDuration || media.frames.reduce((s, f) => s + f.duration, 0) || 1000;
  if (!loop && timeMs >= total) return media.frames[media.frames.length - 1].bitmap;
  let t = loop ? ((timeMs % total) + total) % total : Math.max(0, timeMs);
  for (const f of media.frames) {
    if (t < f.duration) return f.bitmap;
    t -= f.duration;
  }
  return media.frames[media.frames.length - 1].bitmap;
}

function needsRealtimeMedia() {
  return stops.some(s =>
    (s.media || []).some(m =>
      m.kind === 'video' || m.kind === 'live' || (m.kind === 'gif' && !m.frames))
    || (s.icon && s.icon.kind === 'gif' && !s.icon.frames));
}

/* ============================================================ per-leg custom vehicle icons */
const ICON_FACINGS = new Set(['right', 'left', 'up']);

function defaultIconConfig(extra = {}) {
  return {
    kind: 'image', name: '', dataUrl: '', emoji: '', path: '', sizeBytes: 0,
    img: null, frames: null, totalDuration: 0,
    size: 48, baseFacing: 'right', autoFlip: true, rotate: false,
    ...extra,
  };
}

function iconPreviewHtml(icon) {
  if (!icon) return `<span class="icon-none">${esc(t('iconDefault'))}</span>`;
  if (icon.kind === 'emoji') return `<span class="icon-emoji">${esc(icon.emoji)}</span>`;
  const src = icon.dataUrl || (icon.img && icon.img.src) || '';
  return src ? `<img src="${esc(src)}" alt="${esc(t('iconPreview'))}" />` : `<span class="icon-none">${esc(t('iconDefault'))}</span>`;
}

function serializeIcon(icon) {
  if (!icon) return null;
  const hasPath = !!icon.path;
  return {
    kind: icon.kind, name: icon.name || '', emoji: icon.emoji || '',
    path: icon.path || '',
    // A linked icon is stored as a path; the base64 copy is only kept as a
    // fallback for icons that could not be linked to a file.
    dataUrl: !hasPath && typeof icon.dataUrl === 'string' && icon.dataUrl.startsWith('data:image/') ? icon.dataUrl : '',
    bytes: Math.round(Number(icon.sizeBytes) || 0),
    size: clamp(Number(icon.size) || 48, 16, 140),
    baseFacing: ICON_FACINGS.has(icon.baseFacing) ? icon.baseFacing : 'right',
    autoFlip: icon.autoFlip !== false, rotate: !!icon.rotate,
  };
}

function deserializeIcon(cfg) {
  if (!cfg) return null;
  const kind = ['image', 'gif', 'emoji'].includes(cfg.kind) ? cfg.kind : 'image';
  const icon = defaultIconConfig({
    kind, name: String(cfg.name || ''),
    emoji: String(cfg.emoji || '').slice(0, 12),
    dataUrl: typeof cfg.dataUrl === 'string' && cfg.dataUrl.startsWith('data:image/') ? cfg.dataUrl : '',
    path: typeof cfg.path === 'string' ? cfg.path : '',
    sizeBytes: Number(cfg.bytes) > 0 ? Number(cfg.bytes) : 0,
    size: clamp(Number(cfg.size) || 48, 16, 140),
    baseFacing: ICON_FACINGS.has(cfg.baseFacing) ? cfg.baseFacing : 'right',
    autoFlip: cfg.autoFlip !== false,
    rotate: !!cfg.rotate,
  });
  if (kind === 'emoji') return icon.emoji ? icon : null;
  // Prefer the absolute-path link when the local file API is available.
  if (icon.path && FS.enabled) icon.dataUrl = fsFileUrl(icon.path);
  else icon.path = '';
  if (!icon.dataUrl) return null;
  icon.img = new Image();
  icon.img.src = icon.dataUrl;
  if (kind === 'gif') {
    fetch(icon.dataUrl).then(r => r.blob())
      .then(blob => decodeGifFrames(new File([blob], icon.name || 'icon.gif', { type: 'image/gif' })))
      .then(decoded => {
        if (decoded) { icon.frames = decoded.frames; icon.totalDuration = decoded.total; }
      })
      .catch(() => {});
  }
  return icon;
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => resolve(String(rd.result));
    rd.onerror = reject;
    rd.readAsDataURL(file);
  });
}

async function createIconFromFile(file) {
  if (file.size > 4 * 1024 * 1024) throw new Error('icon too large');
  const dataUrl = await readFileDataUrl(file);
  const img = await loadImageElement(dataUrl);
  const kind = isGifFile(file) ? 'gif' : 'image';
  const icon = defaultIconConfig({
    kind, name: file.name, dataUrl, img, sizeBytes: file.size,
  });
  // Link the icon to its file when the resource folder is known and the file
  // really is there (same size check as the media items).
  if (settings.resourceRoot) {
    const guess = fsJoin(settings.resourceRoot, file.webkitRelativePath || file.name);
    const st = await fsStat(guess);
    if (st && st.exists && st.isFile && (!st.size || Math.abs(st.size - file.size) <= 2)) icon.path = guess;
  }
  if (kind === 'gif') {
    // Show the GIF immediately via <img>; decode frames in the background so
    // a slow/large GIF can never block the upload or hide the icon.
    decodeGifFrames(file).then(decoded => {
      if (decoded) { icon.frames = decoded.frames; icon.totalDuration = decoded.total; }
    }).catch(err => console.warn('GIF icon decode failed, using animated image:', err));
  }
  return icon;
}

function setEmojiIcon(stop, text) {
  const emoji = String(text || '').trim().slice(0, 12);
  if (!emoji) return;
  stop.icon = {
    ...defaultIconConfig(), kind: 'emoji', emoji, dataUrl: '', img: null, frames: null,
    size: stop.icon?.size || 48,
    baseFacing: stop.icon?.baseFacing || 'right',
    autoFlip: stop.icon?.autoFlip !== false,
    rotate: !!stop.icon?.rotate,
  };
}

function legDirectionInfo(leg) {
  if (!leg) return { east: true, eastWest: false, bearing: 0 };
  const from = leg.from, to = leg.to;
  const dlng = shortestDelta(from.lng, to.lng);
  const dlat = to.lat - from.lat;
  const mid = (from.lat + to.lat) / 2 * Math.PI / 180;
  const eastKm = dlng * 111.32 * Math.cos(mid);
  const northKm = dlat * 110.57;
  return {
    east: eastKm >= 0,
    eastWest: Math.abs(eastKm) >= Math.max(1, Math.abs(northKm) * 0.25),
    bearing: bearingDeg([from.lng, from.lat], [to.lng, to.lat]),
  };
}

function customIconTransform(icon, leg, heading) {
  const dir = legDirectionInfo(leg);
  let flip = false, rotation = 0;
  if (!icon) return { flip, rotation };
  const h = Number.isFinite(heading) ? heading : dir.bearing;
  if (icon.rotate) {
    if (icon.baseFacing === 'up') {
      rotation = h;
    } else {
      // Side-view art is mirrored into the east/west half instead of being
      // rotated 180° (which would make a left-facing car go upside down).
      // The remaining tangent angle stays within ±90°.
      const eastHalf = Math.sin(h * Math.PI / 180) >= 0;
      if (icon.baseFacing === 'right') {
        flip = !eastHalf;
        rotation = h - (flip ? 270 : 90);
      } else {
        flip = eastHalf;
        rotation = h - (flip ? 90 : 270);
      }
    }
    rotation = ((rotation + 540) % 360) - 180;
  } else if (icon.autoFlip && dir.eastWest) {
    if (icon.baseFacing === 'right' && !dir.east) flip = true;
    if (icon.baseFacing === 'left' && dir.east) flip = true;
  }
  return { flip, rotation };
}



function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function legIconControls(s) {
  const icon = s.icon;
  const disabled = icon ? '' : 'disabled';
  const autoDisabled = !icon || (icon && icon.rotate) ? 'disabled' : '';
  const size = icon ? clamp(Number(icon.size) || 48, 16, 140) : 48;
  const facing = icon ? icon.baseFacing : 'right';
  const emoji = icon && icon.kind === 'emoji' ? icon.emoji : '';
  const summary = icon
    ? (icon.kind === 'emoji' ? icon.emoji : (icon.name || t('vehicleIcon')))
    : t('iconDefault');
  return `
    <details class="leg-icon ${icon ? 'has-icon' : ''}" ${icon ? 'open' : ''}>
      <summary>
        <span class="icon-label">${esc(t('vehicleIcon'))}</span>
        <span class="icon-preview">${iconPreviewHtml(icon)}</span>
        <span class="icon-summary">${esc(summary)}</span>
      </summary>
      <div class="icon-settings">
        <div class="icon-actions">
          <button type="button" class="btn btn-ghost small" data-icon-upload="${s.id}">${esc(t('iconUpload'))}</button>
          <button type="button" class="btn btn-ghost small ${icon ? '' : 'hidden'}" data-icon-clear="${s.id}">${esc(t('iconClear'))}</button>
          <button type="button" class="btn btn-ghost small path-btn ${icon && icon.kind !== 'emoji' ? '' : 'hidden'} ${icon && icon.path ? 'on' : ''}" data-icon-link="${s.id}" title="${esc(icon && icon.path ? t('mediaPathLinked') : t('mediaPathMissing'))}">${svgIcon('link')}<span>${esc(t('bindPath'))}</span></button>
          <input type="text" class="icon-emoji-input" data-icon-emoji="${s.id}" value="${esc(emoji)}" placeholder="${esc(t('iconEmojiPh'))}" maxlength="12" />
        </div>
        <div class="icon-row">
          <label>${esc(t('iconSize'))} <input type="number" data-icon-size="${s.id}" min="16" max="140" step="1" value="${size}" ${disabled} /> px</label>
          <label>${esc(t('iconFacing'))}
            <select data-icon-facing="${s.id}" ${disabled}>
              <option value="right" ${facing === 'right' ? 'selected' : ''}>${esc(t('iconFacingRight'))}</option>
              <option value="left" ${facing === 'left' ? 'selected' : ''}>${esc(t('iconFacingLeft'))}</option>
              <option value="up" ${facing === 'up' ? 'selected' : ''}>${esc(t('iconFacingUp'))}</option>
            </select>
          </label>
        </div>
        <div class="icon-row checks">
          <label class="check"><input type="checkbox" data-icon-flip="${s.id}" ${icon && icon.autoFlip !== false ? 'checked' : ''} ${autoDisabled} />${esc(t('iconAutoFlip'))}</label>
          <label class="check"><input type="checkbox" data-icon-rotate="${s.id}" ${icon && icon.rotate ? 'checked' : ''} ${disabled} />${esc(t('iconRotate'))}</label>
        </div>
        <p class="hint">${esc(t('iconHint'))}</p>
      </div>
    </details>`;
}

function renderStops() {
  const ol = $('#stops'); ol.innerHTML = '';
  stops.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'stop';
    li.dataset.id = s.id;
    const media = s.media || [];
    const thumb = media[0] ? mediaThumbSrc(media[0]) : '';
    const interval = Number(s.mediaInterval || settings.mediaInterval || 3);
    const m = MODES[s.mode] || MODES.plane;
    const routeKey = m.route === 'osrm' ? (s.mode === 'train' ? 'routeCorridor' : 'routeRoad')
      : m.route === 'sea' ? 'routeSea' : 'routeAir';
    const legSelect = i === 0 ? '' : `
      <div class="leg">
        <span>${esc(t('via'))}</span>
        <select data-mode="${s.id}">
          ${Object.keys(MODES).map(k => `<option value="${k}" ${s.mode === k ? 'selected' : ''}>${esc(modeLabel(k))}</option>`).join('')}
        </select>
        <span class="route-note ${routeKey}" title="${esc(t('routeHint'))}">${esc(t(routeKey))}</span>
      </div>`;
    const durationRow = i === 0 ? '' : `
      <div class="leg-duration">
        <label>${esc(t('legDuration'))}
          <input type="number" min="1" max="120" step="0.5" value="${Number(s.legDuration) > 0 ? Number(s.legDuration) : ''}" placeholder="${esc(t('legDurationAuto'))}" data-leg-duration="${s.id}" />
          <span>${LANG === 'zh' ? '秒' : 's'}</span>
        </label>
        <span class="hint">${esc(t('legDurationHint'))}</span>
      </div>`;
    const mediaStrip = media.length ? `
      <div class="media-strip" data-media-strip="${s.id}" title="${esc(t('mediaDragHint'))}">
        ${media.map(m => `
          <div class="media-chip ${m.kind} ${m.path ? 'linked' : 'unlinked'}" draggable="true" data-media-id="${m.id}" title="${esc(m.path || m.name)}">
            ${mediaThumbSrc(m) ? `<img src="${esc(mediaThumbSrc(m))}" alt="${esc(t('photoAlt'))}" draggable="false" />` : `<span>${esc(mediaKindLabel(m.kind))}</span>`}
            <span class="kind">${esc(mediaKindLabel(m.kind))}</span>
            <button class="link" type="button" data-media-link="${s.id}" data-media-id="${m.id}" title="${esc(m.path ? t('mediaPathLinked') : t('mediaPathMissing'))}">${svgIcon('link')}</button>
            <button class="del" type="button" data-media-del="${s.id}" data-media-id="${m.id}" title="${esc(t('mediaDelete'))}">×</button>
          </div>`).join('')}
        <label class="media-interval" title="${esc(t('mediaInterval'))}">${esc(t('mediaIntervalShort'))}
          <input type="number" min="1" max="15" step="0.5" value="${interval.toFixed(1)}" data-media-interval="${s.id}" />
          <span class="unit">${LANG === 'zh' ? '秒' : 's'}</span>
        </label>
      </div>` : '';
    li.innerHTML = `
      <div class="top">
        <div class="idx" title="${esc(t('tipDrag'))}">${i + 1}</div>
        ${thumb ? `<img class="thumb" src="${esc(thumb)}" alt="${esc(t('photoAlt'))}" />` : ''}
        <div class="name" data-rename="${s.id}" title="${esc(t('tipRename'))}">${esc(stopLabel(s))}</div>
        <button class="mini media-btn ${media.length ? 'on' : ''}" data-photo="${s.id}" title="${esc(t('addMedia'))}">${svgIcon('camera')}${media.length ? `<span class="media-count">${media.length}</span>` : ''}</button>
        <button class="mini" data-up="${s.id}" title="${esc(t('tipUp'))}">${svgIcon('up')}</button>
        <button class="mini" data-down="${s.id}" title="${esc(t('tipDown'))}">${svgIcon('down')}</button>
        <button class="mini" data-del="${s.id}" title="${esc(t('tipRemove'))}">${svgIcon('x')}</button>
      </div>${legSelect}${durationRow}${i === 0 ? '' : legIconControls(s)}${mediaStrip}`;
    ol.appendChild(li);
  });
  $('#stop-count').textContent = stops.length;

  ol.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    const stop = stops.find(s => s.id === b.dataset.del);
    disposeStopMedia(stop);
    stops = stops.filter(s => s.id !== b.dataset.del);
    afterStopsChange();
  });
  ol.querySelectorAll('[data-up]').forEach(b => b.onclick = () => move(b.dataset.up, -1));
  ol.querySelectorAll('[data-down]').forEach(b => b.onclick = () => move(b.dataset.down, 1));
  ol.querySelectorAll('[data-mode]').forEach(sel => sel.onchange = () => {
    const s = stops.find(x => x.id === sel.dataset.mode);
    if (s) { s.mode = sel.value; renderStops(); refreshRoutePreview(); schedulePlaceLayer(); }
  });
  ol.querySelectorAll('[data-leg-duration]').forEach(inp => inp.onchange = () => {
    const s = stops.find(x => x.id === inp.dataset.legDuration);
    if (!s) return;
    const v = parseFloat(inp.value);
    s.legDuration = Number.isFinite(v) && v > 0 ? clamp(v, 1, 120) : null;
  });
  ol.querySelectorAll('[data-photo]').forEach(b => b.onclick = () => {
    photoTargetId = b.dataset.photo;
    $('#file-photo').click();
  });
  ol.querySelectorAll('[data-media-del]').forEach(b => b.onclick = () => removeStopMedia(b.dataset.mediaDel, b.dataset.mediaId));
  ol.querySelectorAll('[data-media-link]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const stop = stops.find(s => s.id === b.dataset.mediaLink);
    const media = stop && (stop.media || []).find(m => m.id === b.dataset.mediaId);
    if (media) openMediaPathDialog(media);
  });
  ol.querySelectorAll('[data-media-interval]').forEach(inp => inp.onchange = () => {
    const s = stops.find(x => x.id === inp.dataset.mediaInterval);
    if (s) s.mediaInterval = clamp(parseFloat(inp.value) || settings.mediaInterval, 1, 15);
    renderStops();
  });
  ol.querySelectorAll('.media-strip').forEach(strip => wireMediaReorder(strip, strip.dataset.mediaStrip));
  ol.querySelectorAll('[data-icon-upload]').forEach(b => b.onclick = () => {
    iconTargetId = b.dataset.iconUpload;
    $('#file-icon').click();
  });
  ol.querySelectorAll('[data-icon-clear]').forEach(b => b.onclick = () => {
    const s = stops.find(x => x.id === b.dataset.iconClear);
    if (s) { s.icon = null; renderStops(); }
  });
  ol.querySelectorAll('[data-icon-link]').forEach(b => b.onclick = () => {
    const s = stops.find(x => x.id === b.dataset.iconLink);
    if (s && s.icon) openIconPathDialog(s);
  });
  ol.querySelectorAll('[data-icon-emoji]').forEach(inp => inp.onchange = () => {
    const s = stops.find(x => x.id === inp.dataset.iconEmoji);
    if (!s) return;
    const v = inp.value.trim();
    if (v) setEmojiIcon(s, v);
    else if (s.icon && s.icon.kind === 'emoji') s.icon = null;
    renderStops();
  });
  ol.querySelectorAll('[data-icon-emoji]').forEach(inp => inp.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
  });
  ol.querySelectorAll('[data-icon-size]').forEach(inp => inp.onchange = () => {
    const s = stops.find(x => x.id === inp.dataset.iconSize);
    if (s && s.icon) s.icon.size = clamp(parseFloat(inp.value) || 48, 16, 140);
  });
  ol.querySelectorAll('[data-icon-facing]').forEach(sel => sel.onchange = () => {
    const s = stops.find(x => x.id === sel.dataset.iconFacing);
    if (s && s.icon) s.icon.baseFacing = ICON_FACINGS.has(sel.value) ? sel.value : 'right';
  });
  ol.querySelectorAll('[data-icon-flip]').forEach(chk => chk.onchange = () => {
    const s = stops.find(x => x.id === chk.dataset.iconFlip);
    if (s && s.icon) s.icon.autoFlip = chk.checked;
  });
  ol.querySelectorAll('[data-icon-rotate]').forEach(chk => chk.onchange = () => {
    const s = stops.find(x => x.id === chk.dataset.iconRotate);
    if (s && s.icon) { s.icon.rotate = chk.checked; renderStops(); }
  });
  ol.querySelectorAll('[data-rename]').forEach(el => el.onclick = () => startRename(el.dataset.rename, el));

  // Drag to reorder — grab the number badge. The ▲▼ buttons stay as the
  // touch/keyboard fallback (HTML5 drag-and-drop is pointer-only).
  ol.querySelectorAll('.stop').forEach(li => {
    li.querySelector('.idx').addEventListener('mousedown', () => { li.draggable = true; });
    li.addEventListener('dragstart', e => {
      if (e.target.closest('.media-chip')) return;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', li.dataset.id); } catch (err) { /* Safari */ }
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      li.draggable = false;
      commitDomOrder();
    });
  });
  ol.ondragover = e => {
    const dragging = ol.querySelector('.stop.dragging');
    if (!dragging) return;
    e.preventDefault();
    const before = stopBefore(ol, e.clientY);
    if (before == null) ol.appendChild(dragging);
    else if (before !== dragging) ol.insertBefore(dragging, before);
  };
  updatePathStatus();
  schedulePlaceLayer();
}

/* ---- media chips: drag horizontally to reorder the stop's carousel ----
   The chips are a direct drag handle (unlike stop rows, which need the
   number badge) because they are already small, discrete targets. */
function wireMediaReorder(strip, stopId) {
  strip.querySelectorAll('.media-chip').forEach(chip => {
    chip.addEventListener('dragstart', e => {
      e.stopPropagation();
      chip.classList.add('dragging');
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', chip.dataset.mediaId); } catch { /* Safari */ }
    });
    chip.addEventListener('dragend', e => {
      e.stopPropagation();
      chip.classList.remove('dragging');
      strip.classList.remove('drag-over');
      commitMediaOrder(stopId, strip);
    });
  });
  strip.addEventListener('dragover', e => {
    const dragging = strip.querySelector('.media-chip.dragging');
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    try { e.dataTransfer.dropEffect = 'move'; } catch { /* ignore */ }
    strip.classList.add('drag-over');
    const before = chipBefore(strip, e.clientX);
    const label = strip.querySelector('.media-interval');
    if (before == null) strip.insertBefore(dragging, label || null);
    else if (before !== dragging) strip.insertBefore(dragging, before);
  });
  strip.addEventListener('dragleave', e => {
    if (!strip.contains(e.relatedTarget)) strip.classList.remove('drag-over');
  });
  strip.addEventListener('drop', e => {
    if (!strip.querySelector('.media-chip.dragging')) return;
    e.preventDefault();
    e.stopPropagation();
    strip.classList.remove('drag-over');
  });
}

function chipBefore(strip, x) {
  for (const chip of strip.querySelectorAll('.media-chip:not(.dragging)')) {
    const r = chip.getBoundingClientRect();
    if (x < r.left + r.width / 2) return chip;
  }
  return null;
}

// Adopt the order the chips were dropped into; the same order is used by the
// preview and by the exported video.
function commitMediaOrder(stopId, strip) {
  const stop = stops.find(s => s.id === stopId);
  if (!stop) return renderStops();
  const byId = new Map((stop.media || []).map(m => [m.id, m]));
  const next = [...strip.querySelectorAll('.media-chip')].map(chip => byId.get(chip.dataset.mediaId)).filter(Boolean);
  if (next.length !== (stop.media || []).length) return renderStops();
  const changed = next.some((m, i) => m !== stop.media[i]);
  stop.media = next;
  renderStops();
  if (changed) toast(t('mediaReordered'), 2200);
}

// first stop whose midpoint is below the pointer — the drop lands above it
function stopBefore(ol, y) {
  for (const el of ol.querySelectorAll('.stop:not(.dragging)')) {
    const r = el.getBoundingClientRect();
    if (y < r.top + r.height / 2) return el;
  }
  return null;
}

// adopt the order the user dropped the rows into
function commitDomOrder() {
  const byId = new Map(stops.map(s => [s.id, s]));
  const next = [...$('#stops').querySelectorAll('.stop')].map(li => byId.get(li.dataset.id)).filter(Boolean);
  if (next.length !== stops.length) return renderStops();
  const changed = next.some((s, i) => s !== stops[i]);
  stops = next;
  if (changed) afterStopsChange(); else renderStops();
}

// click a stop name to rename it in place
function startRename(sid, nameEl) {
  const s = stops.find(x => x.id === sid);
  if (!s) return;
  const li = nameEl.closest('.stop');
  li.draggable = false;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'name-edit';
  input.value = stopLabel(s);
  nameEl.replaceWith(input);
  input.focus(); input.select();
  let closed = false;
  const close = save => {
    if (closed) return;
    closed = true;
    const v = input.value.trim();
    if (save && v) {
      s.name = v;
      delete s.nameZh;
      delete s.nameEn;
    }
    renderStops();
  };
  input.onblur = () => close(true);
  input.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); close(true); }
    else if (e.key === 'Escape') { e.preventDefault(); close(false); }
  };
}
function move(sid, dir) {
  const i = stops.findIndex(s => s.id === sid); const j = i + dir;
  if (j < 0 || j >= stops.length) return;
  [stops[i], stops[j]] = [stops[j], stops[i]];
  afterStopsChange();
}
function afterStopsChange() {
  renderStops();
  refreshRoutePreview();
  fitToStops(false);
  schedulePlaceLayer();
}

function addStopAt(lng, lat, name, mode, extra = {}) {
  const s = {
    id: id(),
    name: name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    lng, lat, mode: mode || 'plane',
  };
  if (extra.nameZh) s.nameZh = extra.nameZh;
  if (extra.nameEn) s.nameEn = extra.nameEn;
  if (extra.province) s.province = extra.province;
  if (extra.pinyin) s.pinyin = extra.pinyin;
  if (extra.customId) s.customId = extra.customId;
  stops.push(s);
  afterStopsChange();
  if (!name) reverseName(s);
  return s;
}
async function reverseName(s) {
  // The offline index gives an instant Chinese name even when Nominatim is
  // unreachable (common on domestic networks).
  const near = nearestLocalPlace(s.lng, s.lat, 80);
  if (near) {
    s.nameZh = near.name;
    s.nameEn = near.en || s.name;
    s.name = LANG === 'en' ? s.nameEn : s.nameZh;
    s.province = near.province || '';
    renderStops();
    schedulePlaceLayer();
    return;
  }
  try {
    const lang = LANG === 'zh' ? 'zh-CN,zh;q=0.9,en;q=0.5' : 'en';
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${s.lat}&lon=${s.lng}&accept-language=${encodeURIComponent(lang)}`);
    const j = await r.json();
    const a = j.address || {};
    const nm = a.city || a.town || a.village || a.county || a.state || j.name;
    if (nm) {
      s.name = nm;
      renderStops();
      schedulePlaceLayer();
    }
  } catch (e) { /* keep coords as name */ }
}

/* ---- custom places CRUD + plaintext JSON ---- */
function normalizeCustomPlace(raw) {
  if (!raw) return null;
  const name = String(raw.name || '').trim();
  const lng = Number(raw.lng);
  const lat = Number(raw.lat);
  if (!name || !Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return { id: id(), name, en: name, pinyin: '', lng, lat, kind: 'custom' };
}

function readCustomForm() {
  const name = $('#inp-custom-name').value.trim();
  const lng = parseFloat(String($('#inp-custom-lng').value).replace(',', '.'));
  const lat = parseFloat(String($('#inp-custom-lat').value).replace(',', '.'));
  if (!name || !Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    toast(t('customCoordsInvalid'));
    return null;
  }
  return { name, lng, lat };
}

function renderCustomPlaces() {
  const box = $('#custom-list');
  if (!box) return;
  if (editingCustomId && !customPlaces.some(p => p.id === editingCustomId)) editingCustomId = null;
  $('#custom-count').textContent = customPlaces.length;
  if (!customPlaces.length) {
    box.innerHTML = `<div class="custom-empty">${esc(t('customEmpty'))}</div>`;
  } else {
    box.innerHTML = customPlaces.map(p => `
      <div class="custom-row ${p.id === editingCustomId ? 'editing' : ''}">
        <div class="meta">
          <div class="nm">${esc(p.name)}</div>
          <div class="co">${Number(p.lng).toFixed(5)}, ${Number(p.lat).toFixed(5)}</div>
        </div>
        <button data-custom-edit="${p.id}">${esc(t('customEdit'))}</button>
        <button class="del" data-custom-del="${p.id}">${esc(t('customDelete'))}</button>
      </div>`).join('');
  }
  box.querySelectorAll('[data-custom-edit]').forEach(b => b.onclick = () => beginEditCustom(b.dataset.customEdit));
  box.querySelectorAll('[data-custom-del]').forEach(b => b.onclick = () => deleteCustomPlace(b.dataset.customDel));
  const btn = $('#btn-add-custom');
  if (btn) btn.textContent = editingCustomId ? t('customUpdate') : t('addCustom');
  const cancel = $('#btn-cancel-custom');
  if (cancel) cancel.classList.toggle('hidden', !editingCustomId);
}

function beginEditCustom(customId) {
  const p = customPlaces.find(x => x.id === customId);
  if (!p) return;
  editingCustomId = customId;
  $('#custom-place').open = true;
  $('#inp-custom-name').value = p.name;
  $('#inp-custom-lng').value = p.lng;
  $('#inp-custom-lat').value = p.lat;
  renderCustomPlaces();
  $('#inp-custom-name').focus();
  $('#custom-place').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function resetCustomEditor() {
  editingCustomId = null;
  $('#inp-custom-name').value = '';
  $('#inp-custom-lng').value = '';
  $('#inp-custom-lat').value = '';
  renderCustomPlaces();
}

function submitCustomPlace() {
  const v = readCustomForm();
  if (!v) return;
  if (editingCustomId) {
    const place = customPlaces.find(p => p.id === editingCustomId);
    if (!place) { resetCustomEditor(); return; }
    place.name = v.name; place.en = v.name; place.lng = v.lng; place.lat = v.lat;
    saveCustomPlaces();
    rebuildPlaceIndex();
    let moved = false;
    for (const s of stops) {
      if (s.customId === editingCustomId) {
        s.name = v.name; s.nameZh = v.name; s.nameEn = v.name;
        s.lng = v.lng; s.lat = v.lat;
        moved = true;
      }
    }
    if (moved) afterStopsChange(); else renderStops();
    resetCustomEditor();
    toast(t('customUpdated', { name: v.name }));
    return;
  }
  let place = customPlaces.find(p => normalizeQuery(p.name) === normalizeQuery(v.name)
    && Math.abs(p.lng - v.lng) < 1e-5 && Math.abs(p.lat - v.lat) < 1e-5);
  if (!place) {
    place = { id: id(), name: v.name, en: v.name, pinyin: '', lng: v.lng, lat: v.lat, kind: 'custom' };
    customPlaces.push(place);
    saveCustomPlaces();
    rebuildPlaceIndex();
  }
  addStopAt(v.lng, v.lat, v.name, 'plane', { nameZh: v.name, nameEn: v.name, customId: place.id });
  $('#inp-custom-name').value = '';
  renderCustomPlaces();
  toast(t('customAdded', { name: v.name }));
}

function deleteCustomPlace(customId) {
  const p = customPlaces.find(x => x.id === customId);
  if (!p) return;
  customPlaces = customPlaces.filter(x => x.id !== customId);
  for (const s of stops) if (s.customId === customId) delete s.customId;
  saveCustomPlaces();
  rebuildPlaceIndex();
  if (editingCustomId === customId) resetCustomEditor(); else renderCustomPlaces();
  renderStops();
  toast(t('customDeleted', { name: p.name }));
}

function customPlacesFileData() {
  return {
    schema: 'triptrail.customPlaces',
    version: 1,
    exportedAt: new Date().toISOString(),
    places: customPlaces.map(p => ({
      name: p.name,
      lng: Number(Number(p.lng).toFixed(6)),
      lat: Number(Number(p.lat).toFixed(6)),
    })),
  };
}

function saveCustomPlacesFile() {
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const blob = new Blob([JSON.stringify(customPlacesFileData(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `triptrail-custom-places-${stamp}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(t('customSaved'));
}

function loadCustomPlacesFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const data = JSON.parse(String(rd.result).replace(/^\uFEFF/, ''));
      const arr = Array.isArray(data) ? data : (data && Array.isArray(data.places) ? data.places : null);
      if (!arr) throw new Error('bad custom places file');
      const incoming = arr.map(normalizeCustomPlace).filter(Boolean);
      if (arr.length && !incoming.length) throw new Error('no valid places');
      if ($('#chk-custom-replace').checked) {
        customPlaces = incoming;
        const ids = new Set(customPlaces.map(p => p.id));
        for (const s of stops) {
          if (s.customId && !ids.has(s.customId)) delete s.customId;
        }
      } else {
        for (const p of incoming) {
          if (!customPlaces.some(c => normalizeQuery(c.name) === normalizeQuery(p.name)
            && Math.abs(c.lng - p.lng) < 1e-5 && Math.abs(c.lat - p.lat) < 1e-5)) customPlaces.push(p);
        }
      }
      saveCustomPlaces();
      rebuildPlaceIndex();
      renderCustomPlaces();
      toast(t('customLoaded', { n: incoming.length }));
    } catch (e) {
      console.warn('custom places load failed', e);
      toast(t('customInvalid'));
    }
  };
  rd.onerror = () => toast(t('customInvalid'));
  rd.readAsText(file);
}

/* ============================================================ resource links
   A project config stores *links* — absolute paths — to the photos, videos,
   icons and music it uses instead of embedding the bytes. A browser cannot
   read a path from the file dialog, so the local server (server.mjs) resolves
   names to paths and streams the files back on load. Without that API — for
   example when the page is hosted on a plain static server — every helper here
   quietly switches off and the old "re-add the files" flow remains. */

function pathBaseName(p) {
  return String(p || '').split(/[\\/]/).pop() || '';
}

function fsIsAbsolute(p) {
  return /^[a-zA-Z]:[\\/]/.test(p) || /^\\\\/.test(p) || /^\//.test(p);
}

// Windows' "Copy as path" wraps the path in double quotes; accept that (and
// stray quote characters) when a path is pasted into a field.
function cleanPathInput(v) {
  return String(v || '').trim().replace(/^["'\u201c\u201d\u2018\u2019]+|["'\u201c\u201d\u2018\u2019]+$/g, '').trim();
}

function fsJoin(dir, rel) {
  const base = String(dir || '').replace(/[\\/]+$/, '');
  if (!base) return '';
  const sep = /[\\/]/.test(base) || /^[a-zA-Z]:/.test(base) ? '\\' : '/';
  const tail = String(rel || '').replace(/^[\\/]+/, '').replace(/[\\/]+/g, sep);
  return tail ? `${base}${sep}${tail}` : base;
}

function fsFileUrl(p) {
  return `/api/fs/file?path=${encodeURIComponent(p)}&t=${encodeURIComponent(FS.token)}`;
}

let fsProbePromise = null;
async function probeFileApi() {
  if (!FS.enabled && !fsProbePromise) {
    fsProbePromise = fetch('/api/fs/ping', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!j || j.ok !== true || !j.token) return false;
        FS.enabled = true;
        FS.token = String(j.token);
        FS.platform = j.platform || 'win32';
        FS.sep = j.separator || (FS.platform === 'win32' ? '\\' : '/');
        FS.home = j.home || '';
        FS.roots = Array.isArray(j.roots) ? j.roots : [];
        return true;
      })
      .catch(() => false);
  }
  if (fsProbePromise) await fsProbePromise;
  updatePathStatus();
  return FS.enabled;
}

async function ensureFileApi() {
  await probeFileApi();
  return FS.enabled;
}

async function fsStat(p) {
  if (!FS.enabled || !fsIsAbsolute(p)) return null;
  try {
    const r = await fetch(`/api/fs/stat?path=${encodeURIComponent(p)}&t=${encodeURIComponent(FS.token)}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function fsList(p) {
  const q = p ? `path=${encodeURIComponent(p)}&t=${encodeURIComponent(FS.token)}` : `t=${encodeURIComponent(FS.token)}`;
  const r = await fetch(`/api/fs/list?${q}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`list failed: ${r.status}`);
  return r.json();
}

function fsRootLabel(root) {
  const key = `fsRoot_${root.kind}`;
  const label = t(key);
  return label !== key ? label : (pathBaseName(root.path) || root.path);
}

function formatSize(n) {
  const v = Number(n) || 0;
  if (!v) return '';
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  return `${(v / 1024 / 1024).toFixed(1)} MB`;
}

function resourceTargets() {
  const out = [];
  for (const s of stops) {
    for (const m of s.media || []) {
      out.push({
        type: 'media', name: m.name || '', size: m.size || 0,
        path: () => m.path || '',
        set: p => { m.path = p; },
      });
    }
    if (s.icon && s.icon.kind !== 'emoji' && s.icon.name) {
      out.push({
        type: 'icon', name: s.icon.name, size: s.icon.sizeBytes || 0,
        path: () => (s.icon ? s.icon.path || '' : ''),
        set: p => { if (s.icon) s.icon.path = p; },
      });
    }
  }
  if (musicFileName) {
    out.push({
      type: 'music', name: musicFileName, size: musicSize || 0,
      path: () => musicPath || '',
      set: p => { musicPath = p; },
    });
  }
  return out;
}

function pathStats() {
  const all = resourceTargets();
  return { total: all.length, linked: all.filter(x => x.path()).length };
}

function updatePathStatus() {
  const el = $('#path-status');
  if (!el) return;
  const { total, linked } = pathStats();
  el.textContent = total ? t('pathStatus', { linked, total }) : t('pathStatusEmpty');
  el.classList.toggle('warn', total > 0 && linked < total);
  const rootInput = $('#inp-resource-root');
  if (rootInput) {
    rootInput.disabled = !FS.enabled;
    rootInput.title = FS.enabled ? '' : t('fsUnavailable');
  }
  for (const id of ['#btn-pick-root', '#btn-resolve-paths']) {
    const btn = $(id);
    if (btn) btn.disabled = !FS.enabled || (id === '#btn-resolve-paths' && total === 0);
  }
  const hint = $('#resource-root-hint');
  if (hint) hint.textContent = FS.enabled ? t('resourceRootHint') : t('fsUnavailable');
}

/* Resolve the absolute path of every linked resource that does not have one
   yet: first the configured resource folder, then a bounded name+size search
   across the usual photo/music folders. */
async function resolveResourcePaths({ search = true } = {}) {
  if (!(await ensureFileApi())) return { found: 0, missing: 0, total: 0 };
  const all = resourceTargets();
  const pending = all.filter(x => !x.path() && x.name);
  if (!pending.length) return { found: 0, missing: 0, total: all.length };
  let found = 0;
  const root = String(settings.resourceRoot || '').trim();
  if (root) {
    await Promise.all(pending.map(async target => {
      const guess = fsJoin(root, target.name);
      const st = await fsStat(guess);
      if (!st || !st.exists || !st.isFile) return;
      // The folder was chosen explicitly, so a name hit is enough here; files
      // re-exported from an editor may legitimately change size.
      target.set(guess);
      found++;
    }));
  }
  const rest = pending.filter(x => !x.path());
  if (search && rest.length) {
    const dirs = [];
    if (root) dirs.push(root);
    for (const r of FS.roots) if (r.path && !dirs.includes(r.path)) dirs.push(r.path);
    try {
      const r = await fetch('/api/fs/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TripTrail-Token': FS.token },
        body: JSON.stringify({
          dirs: dirs.slice(0, 8),
          files: rest.map(x => ({ name: x.name, size: x.size || 0 })),
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const matches = (j && j.matches) || {};
        for (const target of rest) {
          const hit = matches[target.name];
          if (hit) { target.set(hit); found++; }
        }
      }
    } catch (e) { console.warn('resource path search failed:', e); }
  }
  renderStops();
  return { found, missing: pending.length - found, total: all.length };
}

async function bindAllResourcePaths() {
  if (!(await ensureFileApi())) { toast(t('fsUnavailable'), 4200); return; }
  if (!pathStats().total) { toast(t('pathNoResources')); return; }
  loading(true, t('pathSearching'));
  try {
    const r = await resolveResourcePaths();
    if (r.missing) toast(t('pathResolvedPartial', { found: r.found, missing: r.missing }), 5400);
    else toast(t('pathResolvedAll', { found: r.found }));
  } finally {
    loading(false);
  }
}

/* ---- small stacked modal used by the path tools ---- */
const resModalStack = [];

function paintResModal() {
  const modal = $('#res-modal');
  if (!modal) return;
  const empty = resModalStack.length === 0;
  modal.classList.toggle('hidden', empty);
  modal.setAttribute('aria-hidden', String(empty));
  if (empty) return;
  const body = $('#res-modal-body');
  const foot = $('#res-modal-foot');
  const title = $('#res-modal-title');
  body.innerHTML = '';
  foot.innerHTML = '';
  resModalStack[resModalStack.length - 1]({ body, foot, title });
}

function openResModal(render) {
  resModalStack.push(render);
  paintResModal();
}

function closeResModal() {
  resModalStack.pop();
  paintResModal();
}

function openPathDialog({ title, value = '', hint = '', onSave }) {
  let current = String(value || '');
  openResModal(({ body, foot, title: titleEl }) => {
    titleEl.textContent = title || t('pathDialogTitle');
    body.innerHTML = `
      ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
      <label class="field"><span>${esc(t('absPath'))}</span>
        <input id="res-path-input" type="text" value="${esc(current)}" placeholder="${esc(t('absPathPh'))}" spellcheck="false" autocomplete="off" />
      </label>
      <p class="local-hint">${esc(t('absPathHint'))}</p>`;
    const input = $('#res-path-input');
    input.addEventListener('input', () => { current = input.value; });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); foot.querySelector('[data-act="ok"]').click(); }
    });
    foot.innerHTML = `
      <button class="btn btn-ghost small" data-act="browse" type="button">${esc(t('browse'))}</button>
      <span class="grow"></span>
      <button class="btn btn-ghost small" data-act="clear" type="button">${esc(t('clearPath'))}</button>
      <button class="btn btn-ghost small" data-act="cancel" type="button">${esc(t('cancel'))}</button>
      <button class="btn btn-accent small" data-act="ok" type="button">${esc(t('apply'))}</button>`;
    foot.querySelector('[data-act="browse"]').onclick = async () => {
      if (!(await ensureFileApi())) { toast(t('fsUnavailable'), 4200); return; }
      if (!resModalStack.length) return;
      openFileBrowser(current, p => { current = p; }, 'file');
    };
    foot.querySelector('[data-act="clear"]').onclick = () => { closeResModal(); onSave(''); };
    foot.querySelector('[data-act="cancel"]').onclick = closeResModal;
    foot.querySelector('[data-act="ok"]').onclick = () => {
      const next = cleanPathInput(current);
      closeResModal();
      onSave(next);
    };
  });
}

function openFileBrowser(startDir, onPick, mode = 'file') {
  let dir = String(startDir || '');
  let selected = '';
  openResModal(({ body, foot, title }) => {
    title.textContent = mode === 'dir' ? t('browseTitleDir') : t('browseTitleFile');
    body.innerHTML = `
      <div class="browse-bar">
        <button class="btn btn-ghost small" data-act="up" type="button" title="${esc(t('browseUp'))}">${svgIcon('up')}</button>
        <input id="browse-dir" type="text" value="${esc(dir)}" placeholder="${esc(t('absPathPh'))}" spellcheck="false" autocomplete="off" />
        <button class="btn btn-ghost small" data-act="go" type="button">${esc(t('browseGo'))}</button>
      </div>
      <div id="browse-list" class="browse-list"><div class="browse-empty">${esc(t('working'))}</div></div>`;
    foot.innerHTML = `
      <span class="browse-picked" id="browse-picked">${selected ? esc(selected) : ''}</span>
      <span class="grow"></span>
      <button class="btn btn-ghost small" data-act="cancel" type="button">${esc(t('cancel'))}</button>
      <button class="btn btn-accent small" data-act="choose" type="button">${esc(mode === 'dir' ? t('browsePickFolder') : t('browseChoose'))}</button>`;

    const list = $('#browse-list');
    const dirInput = $('#browse-dir');
    const picked = $('#browse-picked');
    const chooseBtn = foot.querySelector('[data-act="choose"]');

    const setSelected = p => {
      selected = p;
      picked.textContent = p;
      list.querySelectorAll('.browse-row.file').forEach(row => row.classList.toggle('sel', row.dataset.path === p));
    };

    const choose = () => {
      const p = mode === 'dir' ? dir : selected;
      if (!p) { toast(mode === 'dir' ? t('browseNoFolder') : t('browseNoFile')); return; }
      onPick(p);
      closeResModal();
    };
    chooseBtn.onclick = choose;
    foot.querySelector('[data-act="cancel"]').onclick = closeResModal;

    const load = async target => {
      list.innerHTML = `<div class="browse-empty">${esc(t('working'))}</div>`;
      let data;
      try { data = await fsList(target); }
      catch {
        list.innerHTML = `<div class="browse-empty">${esc(t('browseFailed'))}</div>`;
        return;
      }
      dir = data.path || '';
      selected = '';
      picked.textContent = '';
      dirInput.value = dir;
      chooseBtn.disabled = mode === 'dir' ? !dir : true;
      const rows = [];
      for (const r of data.roots || []) rows.push({ name: fsRootLabel(r), path: r.path, dir: true, sub: r.path });
      for (const e of data.entries || []) rows.push(e);
      if (!rows.length) {
        list.innerHTML = `<div class="browse-empty">${esc(t('browseNothing'))}</div>`;
        return;
      }
      list.innerHTML = rows.map(e => `
        <div class="browse-row ${e.dir ? 'dir' : 'file'}" data-path="${esc(e.path)}" data-dir="${e.dir ? '1' : ''}">
          <span class="brow-ic">${svgIcon(e.dir ? 'folder' : 'file')}</span>
          <span class="name">${esc(e.name)}</span>
          <span class="meta">${esc(e.dir ? (e.sub || '') : formatSize(e.size))}</span>
        </div>`).join('');
      list.querySelectorAll('.browse-row').forEach(row => {
        row.onclick = () => {
          if (row.dataset.dir) { load(row.dataset.path); return; }
          setSelected(row.dataset.path);
          if (mode === 'file') chooseBtn.disabled = false;
        };
        row.ondblclick = () => {
          if (row.dataset.dir) load(row.dataset.path);
          else { setSelected(row.dataset.path); choose(); }
        };
      });
    };

    body.querySelector('[data-act="up"]').onclick = () => load('');
    body.querySelector('[data-act="go"]').onclick = () => {
      const p = dirInput.value.trim();
      load(p);
    };
    dirInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); load(dirInput.value.trim()); }
    });
    load(dir);
  });
}

/* ---- per-resource bind dialog ---- */
function openMediaPathDialog(media) {
  if (!media) return;
  if (!FS.enabled) { toast(t('fsUnavailable'), 4200); return; }
  openPathDialog({
    title: t('mediaPathTitle', { name: media.name || '' }),
    value: media.path || '',
    hint: t('mediaPathHint'),
    onSave: async p => {
      media.path = p;
      if (!p) { toast(t('mediaPathCleared')); renderStops(); return; }
      const st = await fsStat(p);
      if (!st || !st.exists || !st.isFile) { toast(t('mediaPathInvalid'), 4200); renderStops(); return; }
      media.size = st.size || media.size || 0;
      toast(t('mediaPathSet'));
      renderStops();
    },
  });
}

function openIconPathDialog(stop) {
  if (!stop || !stop.icon) return;
  if (!FS.enabled) { toast(t('fsUnavailable'), 4200); return; }
  openPathDialog({
    title: t('iconPathTitle', { name: stop.icon.name || '' }),
    value: stop.icon.path || '',
    hint: t('iconPathHint'),
    onSave: async p => {
      if (!stop.icon) return;
      stop.icon.path = p;
      if (!p) { toast(t('mediaPathCleared')); renderStops(); return; }
      const st = await fsStat(p);
      if (!st || !st.exists || !st.isFile) { toast(t('mediaPathInvalid'), 4200); renderStops(); return; }
      stop.icon.sizeBytes = st.size || stop.icon.sizeBytes || 0;
      toast(t('mediaPathSet'));
      renderStops();
    },
  });
}

function openMusicPathDialog() {
  if (!FS.enabled) { toast(t('fsUnavailable'), 4200); return; }
  openPathDialog({
    title: t('musicPathTitle', { name: musicFileName || '' }),
    value: musicPath || '',
    hint: t('musicPathHint'),
    onSave: async p => {
      musicPath = p;
      if (!p) { toast(t('mediaPathCleared')); return; }
      const st = await fsStat(p);
      if (st && st.exists && st.size) musicSize = st.size;
      toast(t('mediaPathSet'));
    },
  });
}

async function pickResourceRoot() {
  if (!(await ensureFileApi())) { toast(t('fsUnavailable'), 4200); return; }
  openFileBrowser(settings.resourceRoot, p => {
    settings.resourceRoot = p;
    const input = $('#inp-resource-root');
    if (input) input.value = p;
    savePrefs();
    updatePathStatus();
    toast(t('resourceRootSet'));
  }, 'dir');
}

function clearMusic() {
  const m = $('#music');
  try { m.pause(); m.removeAttribute('src'); m.load(); } catch { /* ignore */ }
  musicFileName = '';
  musicPath = '';
  musicSize = 0;
  $('#music-name').textContent = t('none');
  $('#btn-music-clear').classList.add('hidden');
  const pathBtn = $('#btn-music-path');
  if (pathBtn) pathBtn.classList.add('hidden');
  updatePathStatus();
}

function configPayload() {
  syncSettingsFromUI();
  return {
    schema: 'triptrail',
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: {
      region: settings.region, style: settings.style, aspect: settings.aspect,
      accent: settings.accent, globe: settings.globe, pitch: settings.pitch,
      labels: settings.labels, cities: settings.cities, borders: settings.borders,
      cityLevel: settings.cityLevel, roads: settings.roads, glow: settings.glow,
      pace: settings.pace, mediaInterval: settings.mediaInterval, mediaRatio: settings.mediaRatio,
      title: settings.title, subtitle: settings.subtitle, watermark: settings.watermark,
      format: settings.format, quality: settings.quality,
      resourceRoot: settings.resourceRoot || '',
      music: musicFileName ? { name: musicFileName, path: musicPath || '' } : null,
    },
    stops: stops.map(s => ({
      name: s.name, nameZh: s.nameZh || '', nameEn: s.nameEn || '',
      lng: s.lng, lat: s.lat, mode: s.mode || 'plane',
      mediaInterval: s.mediaInterval || null,
      legDuration: s.legDuration || null,
      icon: serializeIcon(s.icon),
      // Absolute-path links in carousel order: the saved order is the play order.
      // Entries that could not be reopened when the config was loaded stay in
      // `missingMedia` (at the end) so a save never silently drops a link.
      media: [
        ...(s.media || []).map(m => ({
          kind: m.kind, name: m.name || '', path: m.path || '',
          width: Math.round(Number(m.width) || 0), height: Math.round(Number(m.height) || 0),
          duration: Math.round(Number(m.duration) || 0), size: Math.round(Number(m.size) || 0),
          posterPath: m.posterPath || '',
        })),
        ...(s.missingMedia || []).map(entry => ({
          kind: entry.kind || 'image', name: entry.name || '', path: entry.path || '',
          width: Math.round(Number(entry.width) || 0), height: Math.round(Number(entry.height) || 0),
          duration: Math.round(Number(entry.duration) || 0), size: Math.round(Number(entry.size) || 0),
          posterPath: entry.posterPath || '',
        })),
      ],
    })),
    customPlaces: customPlaces.map(p => ({ name: p.name, lng: p.lng, lat: p.lat })),
  };
}

async function saveConfigFile() {
  loading(true, t('configSaving'));
  try {
    syncSettingsFromUI();
    // Best effort: fill in the absolute path of resources that were added
    // before a resource folder was chosen.
    let missing = 0;
    const stats = pathStats();
    if (stats.linked < stats.total) {
      if (FS.enabled) missing = (await resolveResourcePaths()).missing;
      else missing = stats.total - stats.linked;
    }
    const data = configPayload();
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `triptrail-${stamp}.triptrail.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    if (missing) toast(t('configSavedPartial', { n: missing }), 6000);
    else toast(t('configSaved'));
  } finally {
    loading(false);
  }
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => resolve(String(rd.result));
    rd.onerror = () => reject(rd.error || new Error('read failed'));
    rd.readAsText(file);
  });
}

async function loadConfigFile(file) {
  try {
    const cfg = JSON.parse((await readTextFile(file)).replace(/^\uFEFF/, ''));
    if (!cfg || !Array.isArray(cfg.stops)) throw new Error('bad config');
    if (anim.playing) stopPlay();
    await probeFileApi();
    const s = cfg.settings || {};
    settings.title = typeof s.title === 'string' ? s.title : t('defaultTitle');
    settings.subtitle = typeof s.subtitle === 'string' ? s.subtitle : t('defaultSubtitle');
    settings.accent = /^#[0-9a-f]{6}$/i.test(s.accent || '') ? s.accent : settings.accent;
    settings.aspect = ['16:9', '9:16', '1:1', '4:5'].includes(s.aspect) ? s.aspect : settings.aspect;
    settings.region = s.region === 'global' ? 'global' : 'cn';
    settings.style = typeof s.style === 'string' ? s.style : settings.style;
    settings.globe = !!s.globe;
    settings.pitch = !!s.pitch;
    settings.labels = s.labels !== false;
    settings.cities = s.cities !== false;
    settings.borders = s.borders !== false;
    settings.cityLevel = ['auto', '1', '2', '3'].includes(String(s.cityLevel)) ? String(s.cityLevel) : 'auto';
    settings.roads = s.roads !== false;
    settings.glow = s.glow !== false;
    settings.pace = clamp(Number(s.pace) || 1, 0.4, 2.2);
    settings.mediaInterval = clamp(Number(s.mediaInterval) || 3, 1, 10);
    settings.mediaRatio = MEDIA_RATIOS.includes(s.mediaRatio) ? s.mediaRatio : 'original';
    settings.watermark = typeof s.watermark === 'string' ? s.watermark : '';
    settings.format = s.format === 'webm' ? 'webm' : 'mp4';
    settings.quality = Number(s.quality) === 2 ? 2 : 1;
    if (typeof s.resourceRoot === 'string' && fsIsAbsolute(s.resourceRoot)) settings.resourceRoot = s.resourceRoot;
    savePrefs();

    disposeAllMedia();
    const pending = [];
    stops = cfg.stops
      .filter(x => x && Number.isFinite(Number(x.lng)) && Number.isFinite(Number(x.lat)))
      .slice(0, 100)
      .map(x => {
        const stop = {
          id: id(), name: String(x.name || x.nameZh || x.nameEn || `${x.lat}, ${x.lng}`),
          nameZh: x.nameZh || '', nameEn: x.nameEn || '',
          lng: Number(x.lng), lat: Number(x.lat), mode: MODES[x.mode] ? x.mode : 'plane',
          mediaInterval: Number(x.mediaInterval) > 0 ? Number(x.mediaInterval) : null,
          legDuration: Number(x.legDuration) > 0 ? clamp(Number(x.legDuration), 1, 120) : null,
          media: [],
          missingMedia: [],
          icon: deserializeIcon(x.icon),
        };
        if (Array.isArray(x.media) && x.media.length) pending.push({ stop, entries: x.media });
        return stop;
      });

    // Re-open every linked file through the local file service, in the saved
    // carousel order.
    let restored = 0;
    let missing = 0;
    if (pending.length) {
      if (FS.enabled) {
        loading(true, t('configRestoringMedia'));
        try {
          for (const job of pending) {
            for (const entry of job.entries) {
              if (!entry || typeof entry !== 'object') { missing++; continue; }
              if (!entry.path || !fsIsAbsolute(String(entry.path))) {
                job.stop.missingMedia.push(entry);
                missing++;
                continue;
              }
              try {
                const media = await mediaFromPath(entry);
                if (media) { job.stop.media.push(media); restored++; }
                else { job.stop.missingMedia.push(entry); missing++; }
              } catch (e) {
                console.warn('media restore failed:', e);
                job.stop.missingMedia.push(entry);
                missing++;
              }
            }
          }
        } finally {
          loading(false);
        }
      } else {
        for (const job of pending) job.stop.missingMedia = job.entries.slice();
        missing = pending.reduce((n, job) => n + job.entries.length, 0);
      }
    }
    const legacyMeta = cfg.stops.some(x => Array.isArray(x.mediaMeta) && x.mediaMeta.length);

    // Background music is a link as well.
    const mus = s.music && typeof s.music === 'object' ? s.music : null;
    if (mus && mus.path && FS.enabled && fsIsAbsolute(String(mus.path))) {
      musicFileName = String(mus.name || pathBaseName(String(mus.path)));
      musicPath = String(mus.path);
      musicSize = 0;
      const el = $('#music');
      el.src = fsFileUrl(musicPath);
      el.load();
      $('#music-name').textContent = musicFileName;
      $('#btn-music-clear').classList.remove('hidden');
      const musPathBtn = $('#btn-music-path');
      if (musPathBtn) musPathBtn.classList.remove('hidden');
    } else if (musicFileName) {
      clearMusic();
    }

    if (Array.isArray(cfg.customPlaces)) {
      for (const p of cfg.customPlaces) {
        const n = String(p.name || '').trim();
        const lng = Number(p.lng), lat = Number(p.lat);
        if (!n || !Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        if (customPlaces.some(c => normalizeQuery(c.name) === normalizeQuery(n) && Math.abs(c.lng - lng) < 1e-5 && Math.abs(c.lat - lat) < 1e-5)) continue;
        customPlaces.push({ id: id(), name: n, en: n, pinyin: '', lng, lat, kind: 'custom' });
      }
      saveCustomPlaces();
      rebuildPlaceIndex();
      renderCustomPlaces();
    }

    $('#inp-title').value = settings.title;
    $('#inp-subtitle').value = settings.subtitle;
    $('#inp-title').dataset.edited = '1';
    $('#inp-subtitle').dataset.edited = '1';
    $('#inp-accent').value = settings.accent;
    document.documentElement.style.setProperty('--accent', settings.accent);
    $('#rng-pace').value = String(settings.pace);
    $('#rng-media-interval').value = String(settings.mediaInterval);
    $('#sel-media-ratio').value = settings.mediaRatio;
    $('#inp-watermark').value = settings.watermark;
    $('#sel-aspect').value = settings.aspect;
    $('#sel-format').value = settings.format;
    $('#sel-quality').value = String(settings.quality);
    applyInitialControls();
    $('#pace-val').textContent = paceLabel();
    updateMediaIntervalLabel();
    layoutStage();
    if (map) {
      map.setStyle(styleSpec(settings.style), { diff: false });
      setRegion(settings.region, false);
      applyProjection();
      map.easeTo({ pitch: settings.pitch ? 50 : 0, duration: 400 });
    }
    afterStopsChange();
    toast(t('configLoaded', { n: stops.length }));
    if (restored) setTimeout(() => toast(t('configMediaRestored', { n: restored }), 4600), 1200);
    if (missing) setTimeout(() => toast(t('configMediaMissing', { n: missing }), 5200), restored ? 3000 : 1400);
    else if (legacyMeta && !pending.length) setTimeout(() => toast(t('configMediaLost'), 4200), 1800);
    updatePathStatus();
  } catch (e) {
    console.warn('config load failed', e);
    loading(false);
    toast(t('configInvalid'));
  }
}

/* ---- offline China place index + online fallback ---- */
function normalizeQuery(s) {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s·•,，.。'’"“”\-_/\\()（）]+/g, '');
}

function placeScore(p, q) {
  const nq = normalizeQuery(q);
  if (!nq) return 0;
  const latin = /^[a-z0-9]+$/i.test(nq);
  const names = [p.name, p.fullName, p.en, p.pinyin, p.province, p.provinceEn, ...(p.aliases || [])]
    .filter(Boolean).map(normalizeQuery);
  names.push(normalizeQuery(`${p.province || ''}${p.name || ''}`));
  names.push(normalizeQuery(`${p.name || ''}${p.city || ''}`));
  let score = 0;
  for (const n of names) {
    if (!n) continue;
    if (n === nq) score = Math.max(score, 120);
    else if (n.startsWith(nq)) score = Math.max(score, 88 - Math.min(20, n.length - nq.length));
    // Pinyin/English substrings are too eager (changzhou contains hangzhou);
    // for Latin queries require a prefix, while Chinese names keep substring
    // matching so "西湖" can find "瘦西湖".
    else if (!latin && n.includes(nq)) score = Math.max(score, 58 - Math.min(20, n.length - nq.length));
  }
  // Chinese queries often concatenate a city and a landmark ("杭州西湖").
  if (!latin && score < 80 && q.length >= 2) {
    if (names.some(n => nq.endsWith(n) || n.endsWith(nq))) score = Math.max(score, 45);
  }
  return score;
}

function localSearch(q, limit = 8) {
  if (!chinaData.ready) return [];
  const scored = [];
  for (const p of chinaData.index) {
    const score = placeScore(p, q);
    if (score > 0) scored.push({ ...p, score });
  }
  scored.sort((a, b) => b.score - a.score
    || (a.kind === 'poi' ? 1 : 0) - (b.kind === 'poi' ? 1 : 0)
    || (a.level || 9) - (b.level || 9)
    || (b.pop || 0) - (a.pop || 0));
  return scored.slice(0, limit);
}

function nearestLocalPlace(lng, lat, maxKm = 80) {
  if (!chinaData.ready) return null;
  let best = null, bd = maxKm;
  for (const p of chinaData.cities) {
    const d = haversine([lng, lat], [p.lng, p.lat]);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

async function loadChinaData() {
  try {
    const [r, extraR] = await Promise.all([
      fetch('data/china-cities.json'),
      fetch('data/china-pois-extra.json').catch(() => null),
    ]);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    let extra = [];
    if (extraR && extraR.ok) {
      try { extra = (await extraR.json()).pois || []; } catch { /* optional file */ }
    }
    chinaData.cities = Array.isArray(j.cities) ? j.cities : [];
    chinaData.pois = [...(Array.isArray(j.pois) ? j.pois : []), ...extra];
    chinaData.ready = true;
    rebuildPlaceIndex();
    schedulePlaceLayer();
  } catch (e) {
    chinaData.failed = true;
    console.warn('China place index unavailable:', e);
    toast(t('dataUnavailable'), 3600);
  }
}

function resultTypeLabel(p) {
  if (p.kind === 'poi') return t('typePoi');
  if (p.kind === 'custom') return t('typeCustom');
  if (p.kind === 'district') return t('typeDistrict');
  if (p.level === 1) return t('typeCapital');
  if (p.kind === 'city') return t('typeCity');
  return t('typeOnline');
}

function resultName(p) {
  if (LANG === 'en') return p.nameEn || p.en || p.name;
  return p.nameZh || p.name;
}

function resultSub(p) {
  if (p.kind === 'online') return p.address || p.displayName || '';
  if (p.kind === 'custom') return `${p.lng.toFixed(4)}, ${p.lat.toFixed(4)}`;
  const bits = [];
  const province = LANG === 'en' ? (p.provinceEn || p.province) : p.province;
  if (province && normalizeQuery(province) !== normalizeQuery(resultName(p))) bits.push(province);
  if (p.kind === 'poi') {
    if (p.city && p.city !== p.province && normalizeQuery(p.city) !== normalizeQuery(resultName(p))) bits.push(p.city);
    if (p.address) bits.push(p.address);
  } else if (p.kind === 'district') {
    const parent = (p.aliases || []).find(a => a && a !== p.province);
    if (parent) bits.push(parent);
  }
  if (!bits.length) bits.push(LANG === 'en' ? 'China' : '中国');
  return [...new Set(bits.filter(Boolean))].join(' · ');
}

function currentSearchResults() {
  return Array.isArray(window._ttSearchItems) ? window._ttSearchItems : [];
}

function renderSearchResults(items, state) {
  const box = $('#search-results');
  window._ttSearchItems = items || [];
  window._ttSearchActive = -1;
  box.innerHTML = '';
  if (state && !items.length) {
    const s = document.createElement('div');
    s.className = 'search-state';
    s.textContent = state;
    box.appendChild(s);
  }
  (items || []).forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'result';
    row.tabIndex = 0;
    row.dataset.index = String(idx);
    const main = document.createElement('div');
    main.className = 'result-main';
    const nm = document.createElement('div');
    nm.className = 'result-name';
    nm.textContent = resultName(p);
    const sub = document.createElement('div');
    sub.className = 'result-sub';
    sub.textContent = resultSub(p);
    main.append(nm, sub);
    const tag = document.createElement('span');
    tag.className = 'result-type ' + (p.kind || 'online');
    tag.textContent = resultTypeLabel(p);
    row.append(main, tag);
    row.onclick = () => chooseSearchResult(p);
    row.onkeydown = e => { if (e.key === 'Enter') chooseSearchResult(p); };
    box.appendChild(row);
  });
  if (state && items.length) {
    const s = document.createElement('div');
    s.className = 'search-state';
    s.textContent = state;
    box.appendChild(s);
  }
  box.classList.remove('hidden');
}

function chooseSearchResult(p) {
  searchSeq++;
  $('#search-results').classList.add('hidden');
  $('#inp-search').value = '';
  const display = LANG === 'en' ? (p.nameEn || p.en || p.name) : (p.nameZh || p.name);
  addStopAt(p.lng, p.lat, display, 'plane', {
    nameZh: p.nameZh || (p.kind !== 'online' ? p.name : ''),
    nameEn: p.nameEn || p.en || '',
    province: p.province || '',
    pinyin: p.pinyin || '',
  });
}

function moveSearchActive(delta) {
  const rows = [...$('#search-results').querySelectorAll('.result')];
  if (!rows.length) return;
  let i = (window._ttSearchActive ?? -1) + delta;
  if (i < 0) i = rows.length - 1;
  if (i >= rows.length) i = 0;
  window._ttSearchActive = i;
  rows.forEach((r, k) => r.classList.toggle('active', k === i));
  rows[i].scrollIntoView({ block: 'nearest' });
}

async function nominatimSearch(q, limit = 6) {
  const params = new URLSearchParams({
    format: 'jsonv2', limit: String(limit), addressdetails: '1',
    'accept-language': LANG === 'zh' ? 'zh-CN,zh;q=0.9,en;q=0.5' : 'en',
  });
  if (settings.region === 'cn') params.set('countrycodes', 'cn');
  params.set('q', q);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal: ctrl.signal });
    if (!r.ok) throw new Error(String(r.status));
    const list = await r.json();
    return list.map(p => ({
      name: (p.name || (p.display_name || '').split(',')[0] || q).trim(),
      nameZh: (p.namedetails && p.namedetails['name:zh']) || p.name || '',
      nameEn: p.name || '',
      lng: parseFloat(p.lon), lat: parseFloat(p.lat),
      kind: 'online', address: p.display_name || '',
      level: 9, pop: p.importance || 0,
    })).filter(p => Number.isFinite(p.lng) && Number.isFinite(p.lat));
  } finally {
    clearTimeout(timer);
  }
}

let searchSeq = 0;
async function doSearch(forceOnline = false) {
  const q = $('#inp-search').value.trim();
  if (!q) return;
  const seq = ++searchSeq;
  const local = localSearch(q, 8);
  const shouldOnline = forceOnline || settings.region !== 'cn' || local.length === 0;
  if (!shouldOnline) {
    renderSearchResults(local, '');
    return;
  }
  renderSearchResults(local, t('searchOnline'));
  try {
    const online = await nominatimSearch(q, 6);
    if (seq !== searchSeq) return;
    const merged = [...local];
    for (const p of online) {
      if (merged.some(x => haversine([x.lng, x.lat], [p.lng, p.lat]) < 1.2)) continue;
      merged.push(p);
    }
    if (!merged.length) {
      renderSearchResults([], t('noPlaces'));
      return;
    }
    renderSearchResults(merged.slice(0, 12), online.length ? '' : t('onlineNoResult'));
  } catch (e) {
    if (seq !== searchSeq) return;
    if (local.length) renderSearchResults(local, t('onlineNoResult'));
    else { renderSearchResults([], t('noPlaces')); toast(t('searchFailed')); }
  }
}

/* ---- geocode a single place for the text route builder ---- */
async function geocodeOne(q) {
  const local = localSearch(q, 1)[0];
  if (local && local.score >= 58) {
    return {
      name: local.name, nameZh: local.name, nameEn: local.en || local.name,
      lng: local.lng, lat: local.lat, local: true,
      display_name: [local.name, local.province].filter(Boolean).join(', '),
    };
  }
  const online = await nominatimSearch(q, 1);
  return online[0] || null;
}

/* ============================================================ route builders */
async function buildFromText() {
  const raw = $('#inp-trip').value.trim();
  if (!raw) { toast(t('typeTripFirst')); return; }
  const tokens = raw
    .split(/\n|→|->|—>|–>|,|;|、|，|\bthen\b|\bto\b|然后|再到|再去|到|去/i)
    .map(t => t.trim()).filter(Boolean);
  if (!tokens.length) return;

  const parsed = tokens.map(tok => {
    let mode = null;
    let place = tok.replace(/^(从|由|自)/, '').replace(/^(去|到|往)/, '').trim();
    const m = tok.match(/\b(?:by|via)\s+([a-z-]+)/i)
      || tok.match(/(?:乘坐|坐|乘|搭)\s*([\u4e00-\u9fffA-Za-z-]+)/);
    if (m) {
      const key = m[1].toLowerCase();
      mode = MODE_ALIASES[key] || MODE_ALIASES[m[1]] || null;
      place = place.replace(m[0], '').trim();
    }
    if (!mode) {
      // "高铁去上海", "自驾到杭州": a mode word can appear without 坐/乘.
      const found = Object.keys(MODE_ALIASES).find(k => k.length > 1 && tok.includes(k)
        && /[\u4e00-\u9fff]/.test(k));
      if (found && tok.replace(found, '').trim()) {
        mode = MODE_ALIASES[found];
        place = place.replace(found, '').replace(/^(去|到|往)/, '').trim();
      }
    }
    return { place, mode };
  }).filter(p => p.place);

  loading(true, t('geocoding', { i: 0, n: parsed.length }));
  const found = [];
  for (let i = 0; i < parsed.length; i++) {
    loading(true, t('geocodingItem', { i: i + 1, n: parsed.length, name: parsed[i].place }));
    try {
      const hit = await geocodeOne(parsed[i].place);
      if (hit) {
        found.push({
          ...parsed[i], lng: parseFloat(hit.lng ?? hit.lon), lat: parseFloat(hit.lat),
          name: hit.name, nameZh: hit.nameZh || hit.name, nameEn: hit.nameEn || hit.name,
        });
      } else toast(t('couldNotFind', { name: parsed[i].place }));
    } catch (e) { toast(t('lookupFailed', { name: parsed[i].place })); }
    if (i < parsed.length - 1) await sleep(80); // offline hits are instant
  }
  loading(false);
  if (found.length < 2) { toast(t('needTwo')); return; }

  let carryMode = 'plane';
  disposeAllMedia();
  stops = found.map(f => {
    carryMode = f.mode || carryMode;
    return {
      id: id(), name: LANG === 'en' ? (f.nameEn || f.name) : (f.nameZh || f.name),
      nameZh: f.nameZh, nameEn: f.nameEn, lng: f.lng, lat: f.lat, mode: carryMode,
    };
  });
  afterStopsChange();
  toast(t('builtStops', { n: stops.length }));
}

/* ---- GPX / KML / GeoJSON import ---- */
function importRouteFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const text = rd.result;
      let pts = [];
      if (/\.gpx$/i.test(file.name)) pts = parseGPX(text);
      else if (/\.kml$/i.test(file.name)) pts = parseKML(text);
      else pts = parseGeoJSON(text);
      if (!pts.length) { toast(t('noUsablePoints')); return; }
      pts = samplePoints(pts, 30);
      disposeAllMedia();
      stops = pts.map(p => ({ id: id(), name: p.name || `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`, lng: p.lng, lat: p.lat, mode: p.mode || 'car' }));
      afterStopsChange();
      stops.filter(s => /^[\d.,\s-]+$/.test(s.name)).slice(0, 5).forEach((s, i) => setTimeout(() => reverseName(s), i * 1100));
      toast(t('imported', { n: stops.length, file: file.name }));
    } catch (e) { toast(t('parseFailed')); }
  };
  rd.readAsText(file);
}
function parseGPX(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  let els = [...doc.querySelectorAll('wpt')];
  if (!els.length) els = [...doc.querySelectorAll('trkpt')];
  if (!els.length) els = [...doc.querySelectorAll('rtept')];
  return els.map(e => ({
    lat: parseFloat(e.getAttribute('lat')), lng: parseFloat(e.getAttribute('lon')),
    name: e.querySelector('name') ? e.querySelector('name').textContent.trim() : '',
  })).filter(p => isFinite(p.lat) && isFinite(p.lng));
}
function parseKML(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const out = [];
  doc.querySelectorAll('Placemark').forEach(pm => {
    const nameEl = pm.querySelector('name');
    const name = nameEl ? nameEl.textContent.trim() : '';
    const point = pm.querySelector('Point > coordinates');
    if (point) {
      const [lng, lat] = point.textContent.trim().split(',').map(parseFloat);
      if (isFinite(lat) && isFinite(lng)) out.push({ lat, lng, name });
      return;
    }
    const lineEl = pm.querySelector('LineString > coordinates');
    if (lineEl) {
      lineEl.textContent.trim().split(/\s+/).forEach(c => {
        const [lng, lat] = c.split(',').map(parseFloat);
        if (isFinite(lat) && isFinite(lng)) out.push({ lat, lng, name: '' });
      });
    }
  });
  return out;
}
function parseGeoJSON(text) {
  const j = JSON.parse(text);
  const feats = j.type === 'FeatureCollection' ? j.features : [j];
  const out = [];
  feats.forEach(f => {
    const g = f.geometry || f;
    const p = f.properties || {};
    const name = p.name || p.title || '';
    const rawMode = (p.mode || p.transport || '').toString().toLowerCase();
    const mode = MODES[rawMode] ? rawMode : (MODE_ALIASES[rawMode] || null);
    if (!g) return;
    if (g.type === 'Point') out.push({ lng: g.coordinates[0], lat: g.coordinates[1], name, mode });
    if (g.type === 'LineString') g.coordinates.forEach(c => out.push({ lng: c[0], lat: c[1], name: '' }));
    if (g.type === 'MultiPoint') g.coordinates.forEach(c => out.push({ lng: c[0], lat: c[1], name, mode }));
  });
  return out.filter(p => isFinite(p.lat) && isFinite(p.lng));
}
function samplePoints(pts, max) {
  if (pts.length <= max) return pts;
  const out = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.round(i * (pts.length - 1) / (max - 1))]);
  return out;
}

// Uniformly reduce a coordinate list to at most `max` points (keeps endpoints).
// The rendered trail must stay light — a 50k-vertex line re-projected every
// frame (esp. on globe) drops playback to a slideshow.
function decimate(coords, max) {
  if (coords.length <= max) return coords;
  const out = [coords[0]];
  const step = (coords.length - 1) / (max - 1);
  for (let i = 1; i < max - 1; i++) out.push(coords[Math.round(i * step)]);
  out.push(coords[coords.length - 1]);
  return out;
}

/* ============================================================ precompute legs */
async function precomputeLegs() {
  anim.legs = [];
  const unwrapped = unwrappedStops();
  for (let i = 1; i < stops.length; i++) {
    const from = stops[i - 1], to = stops[i];
    const m = MODES[to.mode] || MODES.plane;
    const A = unwrapped[i - 1], B = unwrapped[i];
    let coords = null;
    if (settings.roads) {
      if (m.route === 'osrm' && haversine(A, B) < m.maxKm) {
        try { coords = await osrmRoute([from.lng, from.lat], [to.lng, to.lat]); } catch (e) { /* fall back */ }
      } else if (m.route === 'sea') {
        loading(true, t('routingSea', { name: stopLabel(to) }));
        try { coords = await seaRoute(A, B); } catch (e) { /* fall back */ }
      }
    }
    if (!coords) coords = legCoords(A, B, m);
    // Anchor every leg at the journey's unwrapped longitude and keep it
    // continuous — OSRM returns raw ±180 coords, and a jump against the
    // accumulated trail would draw a line wrapping the whole globe.
    {
      let prevLng = A[0];
      coords = coords.map(c => {
        prevLng += shortestDelta(prevLng, c[0]);
        return [prevLng, c[1]];
      });
    }
    const path = buildPath(coords);
    const b = new maplibregl.LngLatBounds(); coords.forEach(c => b.extend(c));
    const cam = map.cameraForBounds(b, { padding: fitPadding(settings.aspect === '9:16' ? 120 : 90) });
    anim.legs.push({ from, to, mode: m, modeKey: to.mode, path, zoom: clamp((cam && cam.zoom ? cam.zoom : 5) + 0.15, 2, 11), dist: path.total });
  }
  // Full concatenated route. Reveal fractions use the SAME Mercator metric as
  // MapLibre's line-progress, so the gradient head and the icon stay locked
  // together regardless of latitude.
  anim.fullCoords = [];
  const legStart = [], legLen = [];
  const maxPerLeg = clamp(Math.floor(2200 / anim.legs.length), 80, 600);
  for (const leg of anim.legs) {
    const dc = decimate(leg.path.coords, maxPerLeg);
    legStart.push(anim.fullCoords.length);
    legLen.push(dc.length);
    anim.fullCoords.push(...dc);
  }
  const merc = anim.fullCoords.map(c => { const m = maplibregl.MercatorCoordinate.fromLngLat([c[0], c[1]]); return [m.x, m.y]; });
  const mcum = [0];
  for (let i = 1; i < merc.length; i++) mcum.push(mcum[i - 1] + Math.hypot(merc[i][0] - merc[i - 1][0], merc[i][1] - merc[i - 1][1]));
  anim.mcum = mcum;
  anim.mtotal = mcum[mcum.length - 1] || 1;
  anim.legs.forEach((leg, k) => {
    const s = legStart[k], e = s + legLen[k] - 1;
    leg.pf0 = mcum[s] / anim.mtotal;
    leg.pf1 = mcum[e] / anim.mtotal;
  });
}

// Point at a global Mercator fraction of the full trail — matches line-progress,
// so the icon sits exactly on the revealed head.
function trailPointAt(frac) {
  const cum = anim.mcum, d = clamp(frac, 0, 1) * anim.mtotal;
  let lo = 1, hi = cum.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < d) lo = mid + 1; else hi = mid; }
  const seg = cum[lo] - cum[lo - 1] || 1, t = (d - cum[lo - 1]) / seg;
  const a = anim.fullCoords[lo - 1], b = anim.fullCoords[lo];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/* ============================================================ tile prewarm */
// "Temporarily offline": before recording, sweep the camera along every leg
// at its cruise zoom so all tiles land in the cache. The real pass then pans
// over already-cached tiles and never stalls.
async function prewarmTiles(token) {
  const c = map.getCanvas();
  // total steps across all legs, for a single smooth progress readout
  const plan = [];
  for (const leg of anim.legs) {
    // km covered by one viewport width at this leg's zoom (web-mercator approx)
    const midLat = leg.path.coords[Math.floor(leg.path.coords.length / 2)][1];
    const kmPerScreen = 40075 * Math.cos(midLat * Math.PI / 180) / Math.pow(2, leg.zoom) * (c.clientWidth / 512);
    const steps = clamp(Math.ceil(leg.path.total / (kmPerScreen * 0.9)), 1, 14);
    plan.push({ leg, steps });
  }
  const total = plan.reduce((s, p) => s + p.steps + 1, 0);
  let done = 0;
  for (const { leg, steps } of plan) {
    for (let j = 0; j <= steps; j++) {
      if (token !== cancelToken) return;
      const { pos } = pointAt(leg.path, j / steps);
      map.jumpTo({ center: pos, zoom: leg.zoom, pitch: settings.globe ? 0 : (settings.pitch ? 22 : 8), bearing: 0 });
      await waitForTiles(700);
      done++;
      loading(true, t('caching', { pct: Math.round(done / total * 100) }));
    }
  }
}

/* ============================================================ animation timeline */
/* ---------------------------------------------------------------
   Time-driven timeline (mult.dev-style engine).
   The whole story is a pure function of elapsed time: paintFrame(t) sets the
   camera, trail reveal, marker, pulse, title/photo/caption — nothing sleeps,
   nothing eases via the map. Preview drives it with rAF at wall-clock speed;
   export steps it frame-by-frame and encodes offline at constant fps, so the
   video is perfectly smooth no matter how fast the machine renders. */

function bearingDeg(a, b) {
  const toR = Math.PI / 180;
  const la1 = a[1] * toR, la2 = b[1] * toR, dl = (b[0] - a[0]) * toR;
  const y = Math.sin(dl) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dl);
  return Math.atan2(y, x) / toR;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// spherical interpolation of a [lng,lat] pair (shortest arc, wrap-safe)
function slerpLL(a, b, t) {
  const toR = Math.PI / 180, toD = 180 / Math.PI;
  const v = p => { const la = p[1] * toR, lo = p[0] * toR; return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]; };
  const p0 = v(a), p1 = v(b);
  const th = Math.acos(clamp(p0[0] * p1[0] + p0[1] * p1[1] + p0[2] * p1[2], -1, 1));
  if (th < 1e-5) return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const s = Math.sin(th), w0 = Math.sin((1 - t) * th) / s, w1 = Math.sin(t * th) / s;
  const x = w0 * p0[0] + w1 * p1[0], y = w0 * p0[1] + w1 * p1[1], z = w0 * p0[2] + w1 * p1[2];
  return [Math.atan2(y, x) * toD, Math.atan2(z, Math.hypot(x, y)) * toD];
}

function interpCam(a, b, t) {
  const e = easeInOut(t);
  return { center: slerpLL(a.center, b.center, e), zoom: a.zoom + (b.zoom - a.zoom) * e, pitch: a.pitch + (b.pitch - a.pitch) * e };
}

function overviewCam() {
  const b = new maplibregl.LngLatBounds();
  anim.fullCoords.forEach(c => b.extend(c));
  const cf = map.cameraForBounds(b, { padding: fitPadding(90) });
  if (cf && cf.center) {
    const c = maplibregl.LngLat.convert(cf.center);
    return { center: [c.lng, c.lat], zoom: cf.zoom, pitch: 0 };
  }
  const c = map.getCenter();
  return { center: [c.lng, c.lat], zoom: map.getZoom(), pitch: 0 };
}

function legTravelDurationMs(leg) {
  const explicit = Number(leg && leg.to && leg.to.legDuration);
  if (Number.isFinite(explicit) && explicit > 0) return clamp(explicit * 1000, 1000, 120000);
  return clamp(2200 + leg.dist * 1.1, 2200, 7000) / settings.pace;
}

function buildTimeline() {
  const p = settings.pace;
  const pitchCruise = settings.globe ? 0 : (settings.pitch ? 16 : 0);
  const pitchMax = settings.globe ? 0 : (settings.pitch ? 26 : 8);
  const ov = overviewCam();
  const segs = []; let clock = 0;
  const add = (type, dur, data) => { segs.push({ type, start: clock, end: clock + dur, ...data }); clock += dur; };

  add('intro', clamp(2200 / Math.min(p, 1.2), 1600, 3200), { cam: ov, reached: 1 });
  let prevCam = ov;
  const addMediaSegment = (stop, cam, reached) => {
    if (!stop || !stop.media || !stop.media.length) return;
    const interval = mediaIntervalMs(stop);
    const slots = mediaTimingFor(stop);
    const duration = slots.reduce((sum, s) => sum + s.duration, 0);
    add('media', duration, {
      cam, stop, reached, interval, count: stop.media.length, slots, caption: '',
    });
  };

  if (stops[0] && stops[0].media && stops[0].media.length && anim.legs.length) {
    const pc = { center: [stops[0].lng, stops[0].lat], zoom: anim.legs[0].zoom + 0.55, pitch: pitchCruise };
    add('approach', clamp(750 / p, 350, 950), { a: prevCam, b: pc, caption: '', reached: 1 });
    addMediaSegment(stops[0], pc, 1);
    prevCam = pc;
  }

  anim.legs.forEach((leg, i) => {
    const startCam = { center: trailPointAt(leg.pf0), zoom: leg.zoom, pitch: pitchCruise };
    const endCam = { center: trailPointAt(leg.pf1), zoom: leg.zoom, pitch: pitchCruise };
    const stopCam = { center: endCam.center, zoom: leg.zoom + 0.55, pitch: pitchCruise };
    const caption = t('caption', {
      from: stopLabel(leg.from), to: stopLabel(leg.to),
      mode: modeLabel(leg.modeKey), km: Math.round(leg.dist),
    });
    add('approach', clamp(750 / p, 350, 950), { a: prevCam, b: startCam, caption, reached: i + 1 });
    add('travel', legTravelDurationMs(leg), { leg: i, caption, pitchCruise, pitchMax, reached: i + 1 });
    add('arrival', clamp(680 / p, 400, 950), { a: endCam, b: stopCam, leg: i, caption, reached: i + 2 });
    addMediaSegment(leg.to, stopCam, i + 2);
    prevCam = stopCam;
  });

  add('pullback', clamp(1900 / p, 1200, 2600), { a: prevCam, b: ov, reached: stops.length });
  return { total: clock, segs };
}

function paintFrame(tl, tMs) {
  const t = clamp(tMs, 0, tl.total - 0.001);
  let seg = tl.segs[tl.segs.length - 1];
  for (const s of tl.segs) { if (t < s.end) { seg = s; break; } }
  const lt = clamp((t - seg.start) / Math.max(1, seg.end - seg.start), 0, 1);
  const key = seg.type + ':' + seg.start;
  const entered = anim._seg !== key; anim._seg = key;
  anim.clockMs = t;

  anim.pulse = null; anim.photo = null; anim.titleAlpha = 0;
  anim.reached = seg.reached;
  if (seg.type !== 'media') {
    pauseMediaVideos();
    anim.mediaStop = null;
    anim.mediaElapsed = 0;
    anim.mediaSlots = null;
  }
  let cam;

  if (seg.type === 'intro') {
    anim.phase = 'intro'; anim.caption = ''; anim.marker = null;
    if (entered) setTrailReveal(0);
    anim.titleAlpha = lt < 0.22 ? lt / 0.22 : (lt > 0.82 ? (1 - lt) / 0.18 : 1);
    cam = seg.cam;
  } else if (seg.type === 'approach') {
    anim.phase = 'pause'; anim.caption = seg.caption; anim.marker = null;
    cam = interpCam(seg.a, seg.b, lt);
  } else if (seg.type === 'travel') {
    const leg = anim.legs[seg.leg];
    anim.phase = 'leg'; anim.caption = seg.caption; anim.markerMode = leg.modeKey; anim.legIndex = seg.leg;
    const ef = easeInOut(lt), wave = Math.sin(Math.PI * lt);
    const span = leg.pf1 - leg.pf0, frac = leg.pf0 + span * ef;
    anim.marker = trailPointAt(frac);
    setTrailReveal(frac);
    const ahead = trailPointAt(Math.min(frac + Math.max(span * 0.02, 1e-4), 1));
    const brg = bearingDeg(anim.marker, ahead);
    if (entered || anim.heading == null) anim.heading = brg;
    else anim.heading += (((brg - anim.heading + 540) % 360) - 180) * 0.25;
    anim.alt = wave;   // simulated altitude: 0 at take-off/landing, 1 at cruise
    const lead = trailPointAt(clamp(frac + 0.2 * wave * span, 0, 1));
    cam = { center: lead, zoom: leg.zoom - 0.4 * wave, pitch: seg.pitchCruise + (seg.pitchMax - seg.pitchCruise) * wave };
  } else if (seg.type === 'arrival') {
    const leg = anim.legs[seg.leg];
    anim.phase = 'pause'; anim.caption = seg.caption; anim.legIndex = seg.leg;
    anim.alt = 0;
    setTrailReveal(leg.pf1);
    anim.marker = trailPointAt(leg.pf1); anim.markerMode = leg.modeKey;
    anim.pulse = { lng: leg.to.lng, lat: leg.to.lat, k: easeOutCubic(lt) };
    cam = interpCam(seg.a, seg.b, lt);
  } else if (seg.type === 'media') {
    anim.phase = 'media';
    anim.caption = '';
    anim.marker = null;
    anim.mediaStop = seg.stop;
    anim.mediaElapsed = lt * (seg.end - seg.start);
    anim.mediaInterval = seg.interval;
    anim.mediaCount = seg.count;
    anim.mediaSlots = seg.slots || null;
    cam = seg.cam;
  } else { // pullback
    anim.phase = 'outro'; anim.caption = ''; anim.marker = null;
    setTrailReveal(1);
    cam = interpCam(seg.a, seg.b, lt);
  }

  map.jumpTo({ center: cam.center, zoom: cam.zoom, pitch: cam.pitch, bearing: 0 });
}

function runRealtime(tl, token) {
  return new Promise(resolve => {
    const t0 = performance.now();
    function loop(now) {
      if (token !== cancelToken || !anim.playing) return resolve();
      const t = now - t0;
      paintFrame(tl, Math.min(t, tl.total));
      if (t >= tl.total) return resolve();
      tick(loop);
    }
    loop(performance.now());
  });
}

/* ---- offline export: deterministic frame stepping + WebCodecs + mp4 mux ---- */
function mapFrameSettled(maxWaitMs = 900) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; clearTimeout(cap); resolve(); } };
    // hard cap: never hang if 'render' doesn't fire (e.g. backgrounded tab)
    const cap = setTimeout(finish, maxWaitMs);
    const t0 = performance.now();
    function attempt() {
      map.once('render', () => {
        if (done) return;
        if (map.areTilesLoaded() || performance.now() - t0 > maxWaitMs) finish();
        else attempt();
      });
      map.triggerRepaint();
    }
    attempt();
  });
}

let muxerModPromise = null;
function loadMuxer() {
  if (!muxerModPromise) {
    muxerModPromise = import('./vendor/mp4-muxer.mjs')
      .catch(() => import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm'))
      .catch(e => { muxerModPromise = null; throw e; });
  }
  return muxerModPromise;
}

// Decode the music file, loop/trim it to the video length with a closing
// fade, and return a 44.1kHz stereo AudioBuffer ready for AAC encoding.
async function prepareOfflineAudio(totalMs) {
  const el = $('#music');
  if (!el.src) return null;
  if (typeof AudioEncoder === 'undefined') throw new Error('no AudioEncoder');
  const sup = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 160_000 });
  if (!sup.supported) throw new Error('AAC encode unsupported');
  const durS = totalMs / 1000;
  const raw = await fetch(el.src).then(r => r.arrayBuffer());
  const actx = new OfflineAudioContext(2, Math.ceil(durS * 44100), 44100);
  const buf = await actx.decodeAudioData(raw);
  const src = actx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const gain = actx.createGain();
  gain.gain.setValueAtTime(1, 0);
  gain.gain.setValueAtTime(1, Math.max(0, durS - 1));
  gain.gain.linearRampToValueAtTime(0, durS);
  src.connect(gain); gain.connect(actx.destination);
  src.start(0);
  return actx.startRendering();
}

async function renderOffline(tl, token) {
  if (needsRealtimeMedia()) {
    console.warn('realtime media present; using realtime recording for correct motion');
    return null;
  }
  let mux;
  try {
    mux = await loadMuxer();
  } catch (e) { console.warn('offline export unavailable (muxer):', e); return null; }

  // music: prepared offline and muxed as AAC — if that fails, fall back to
  // realtime capture (which records the audible track)
  let audioBuf = null;
  try { audioBuf = await prepareOfflineAudio(tl.total); }
  catch (e) { console.warn('offline audio unavailable, falling back to realtime:', e); return null; }

  const out = $('#output');
  const fps = settings.quality > 1 ? 60 : 30;
  if (!out.width || !out.height) { console.warn('offline export unavailable: canvas not sized'); return null; }
  // Fit within 1920 on the long edge (H.264 level limits; retina canvases are
  // bigger than any codec level we can rely on) — the downscale from the hi-dpi
  // canvas doubles as supersampling. Dimensions must be even.
  const scale = Math.min(1, 1920 / Math.max(out.width, out.height));
  const W = Math.round(out.width * scale / 2) * 2;
  const H = Math.round(out.height * scale / 2) * 2;
  const exp = document.createElement('canvas');
  exp.width = W; exp.height = H;
  const ectx = exp.getContext('2d');
  ectx.imageSmoothingQuality = 'high';

  const muxer = new mux.Muxer({
    target: new mux.ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H },
    audio: audioBuf ? { codec: 'aac', sampleRate: 44100, numberOfChannels: 2 } : undefined,
    fastStart: 'in-memory',
  });
  let encErr = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => { try { muxer.addVideoChunk(chunk, meta); } catch (e) { encErr = e; } },
    error: e => { encErr = e; },
  });
  const bitrate = clamp(Math.round(W * H * fps * 0.1), 8_000_000, 32_000_000);
  // pick the strongest H.264 profile this machine actually supports
  let configured = false;
  for (const codec of ['avc1.64002A', 'avc1.640028', 'avc1.4D0028', 'avc1.42E01F']) {
    try {
      const cfg = { codec, width: W, height: H, bitrate, framerate: fps };
      const s = await VideoEncoder.isConfigSupported(cfg);
      if (s.supported) { encoder.configure(cfg); configured = true; break; }
    } catch (e) { /* try next */ }
  }
  if (!configured) { console.warn('offline export unavailable: no supported encoder config'); return null; }

  // encode the whole audio track up front (fast, pure CPU)
  if (audioBuf) {
    const aenc = new AudioEncoder({
      output: (chunk, meta) => { try { muxer.addAudioChunk(chunk, meta); } catch (e) { encErr = e; } },
      error: e => { encErr = e; },
    });
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 160_000 });
    const ch0 = audioBuf.getChannelData(0);
    const ch1 = audioBuf.numberOfChannels > 1 ? audioBuf.getChannelData(1) : ch0;
    const CHUNK = 4410; // 100ms
    for (let off = 0; off < audioBuf.length; off += CHUNK) {
      const n = Math.min(CHUNK, audioBuf.length - off);
      const data = new Float32Array(n * 2);
      data.set(ch0.subarray(off, off + n), 0);
      data.set(ch1.subarray(off, off + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: 44100, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / 44100 * 1e6), data });
      aenc.encode(ad); ad.close();
    }
    await aenc.flush();
    if (encErr) { console.warn('offline audio encode failed:', encErr); try { encoder.close(); } catch (e) {} return null; }
  }

  const frames = Math.ceil(tl.total / 1000 * fps);
  const frameUs = Math.round(1e6 / fps);
  for (let i = 0; i < frames; i++) {
    if (token !== cancelToken || encErr) {
      try { encoder.close(); } catch (e) { /* already closed */ }
      if (token !== cancelToken) return undefined;      // user cancelled
      console.warn('offline export aborted (encoder error):', encErr);
      return null;                                       // → realtime fallback
    }
    paintFrame(tl, i * 1000 / fps);
    await mapFrameSettled();
    ectx.drawImage(out, 0, 0, W, H);
    try {
      const vf = new VideoFrame(exp, { timestamp: i * frameUs, duration: frameUs });
      encoder.encode(vf, { keyFrame: i % (fps * 2) === 0 });
      vf.close();
    } catch (e) { encErr = e; continue; }               // handled at loop top
    while (encoder.encodeQueueSize > 8) await sleep(4);
    if (i % 3 === 0) loading(true, t('rendering', { pct: Math.round(i / frames * 100) }));
  }
  if (encErr) { try { encoder.close(); } catch (e) {} console.warn('offline export failed late:', encErr); return null; }
  loading(true, t('finalizing'));
  await encoder.flush();
  muxer.finalize();
  loading(false);
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}

function publishVideo(blob, ext) {
  const url = URL.createObjectURL(blob);
  const a = $('#btn-download');
  a.href = url;
  a.download = `triptrail.${ext}`;
  lastVideo = { ext: ext.toUpperCase(), size: (blob.size / 1048576).toFixed(1) };
  $('#dl-label').textContent = t('downloadLabel', lastVideo);
  a.classList.remove('hidden');
  toast(t('videoReady', { ext: ext.toUpperCase() }));
}

/* ---- main entry ---- */
async function play(record) {
  if (stops.length < 2) { toast(t('addTwoStops')); return; }
  if (anim.playing) return;
  syncSettingsFromUI();
  $('#place-layer').classList.add('hidden');

  loading(true, t('plottingRoute'));
  // Preview renders at 1x for smoothness; export keeps full resolution
  // (×quality) — offline rendering makes its cost irrelevant.
  if (record) {
    if (settings.quality > 1) map.setPixelRatio(Math.max(basePixelRatio, 1) * settings.quality);
  } else {
    map.setPixelRatio(1);
  }
  await sleep(200);
  await precomputeLegs();
  await preloadIcons(Object.keys(MODES), settings.accent);

  anim.playing = true;
  anim.recording = record;
  anim.reached = 0; anim.legIndex = -1; anim.marker = null; anim.heading = null;
  anim.photo = null; anim.photoAlpha = 0; anim.pulse = null; anim._seg = null;
  anim.mediaStop = null; anim.mediaElapsed = 0; anim.mediaSlots = null;
  pauseMediaVideos();
  const token = ++cancelToken;
  setControls(true);

  setSrc('route-bg', EMPTY);
  setSrc('trail', line(anim.fullCoords));
  setTrailReveal(0);

  if (record) {
    loading(true, t('caching', { pct: 0 }));
    await prewarmTiles(token);
    if (token !== cancelToken) { loading(false); return; }
  }

  const tl = buildTimeline();
  fitToStops(true);
  loading(true, t('loadingOverview'));
  await waitForTiles(record ? 5000 : 2000);
  loading(false);
  if (token !== cancelToken) return;

  $('#output').classList.add('show');
  startCompositor();

  // Offline (deterministic, constant-fps) export whenever possible — music is
  // decoded and muxed as AAC. WebM or missing WebCodecs falls back to realtime.
  const offline = record && settings.format === 'mp4' && typeof VideoEncoder !== 'undefined';
  if (offline) {
    let blob = null;
    try { blob = await renderOffline(tl, token); }
    catch (e) { console.warn('offline export failed, falling back to realtime:', e); blob = null; }
    if (blob === undefined) return;                 // cancelled mid-render
    if (blob) {
      if (token === cancelToken) { publishVideo(blob, 'mp4'); endPlay(); }
      return;
    }
    // muxer/encoder unavailable — realtime fallback below
  }

  startMusic();
  if (record) startRecorder();
  await runRealtime(tl, token);
  if (token === cancelToken) endPlay();
}

function endPlay() {
  loading(false);
  anim.playing = false; anim.phase = 'idle';
  stopCompositor();
  if (anim.recording) stopRecorder();
  anim.recording = false;
  anim.titleAlpha = 0; anim.caption = ''; anim.photo = null; anim.photoAlpha = 0;
  anim.mediaStop = null; anim.mediaElapsed = 0; anim.mediaSlots = null;
  anim.pulse = null; anim._seg = null; anim.heading = null;
  pauseMediaVideos();
  stopMusic();
  map.setPixelRatio(basePixelRatio);
  $('#output').classList.remove('show');
  $('#place-layer').classList.remove('hidden');
  setControls(false);
  setSrc('trail', EMPTY);
  refreshRoutePreview();
  schedulePlaceLayer();
}

function stopPlay() { cancelToken++; endPlay(); }

/* ============================================================ compositor
   The overlay canvas draws pins, marker, labels and chrome, composited inside
   the map's `render` event so overlays and the map transform share one frame.

   PREVIEW: the overlay is transparent — we DON'T copy the map into it. The live
   WebGL map is shown directly underneath, so tiles render natively with no
   re-sampling (copying the tile buffer every frame was the tile-flicker cause).
   RECORD: we bake the map (fill + drawImage) so the single recorded canvas
   carries everything. */
let compositeFn = null, compositorGen = 0;

function styleBgColor() {
  try {
    const bg = (map.getStyle().layers || []).find(l => l.type === 'background');
    const c = bg && bg.paint && bg.paint['background-color'];
    if (typeof c === 'string') return c;
  } catch (e) { /* ignore */ }
  return '#0b0f14';
}

function startCompositor() {
  const out = $('#output');
  const ctx = out.getContext('2d');
  const bg = styleBgColor();

  compositeFn = () => {
    const m = map.getCanvas();
    if (out.width !== m.width || out.height !== m.height) { out.width = m.width; out.height = m.height; }
    const dpr = m.width / m.clientWidth || 1;
    if (anim.recording) {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(m, 0, 0, out.width, out.height);
    } else {
      ctx.clearRect(0, 0, out.width, out.height);   // transparent — live map shows through
    }
    drawScene(ctx, out.width, out.height, dpr);
  };
  map.on('render', compositeFn);

  // Keep the map (and thus the compositor) painting even during still pauses,
  // so title/photo/pulse fades stay smooth.
  const gen = ++compositorGen;
  const pump = () => { if (!anim.playing || gen !== compositorGen) return; map.triggerRepaint(); tick(pump); };
  tick(pump);
  compositeFn();

  if (anim.recording && document.hidden) toast(t('keepVisible'));
}

function stopCompositor() {
  compositorGen++;
  if (compositeFn) { map.off('render', compositeFn); compositeFn = null; }
}

function project(lng, lat, dpr) { const p = map.project([lng, lat]); return [p.x * dpr, p.y * dpr]; }

// In globe mode, points on the far side of the earth still project to screen
// coordinates. Use MapLibre's exact camera-based occlusion test, falling back
// to an angular cutoff from the view center on older builds.
function occludedByGlobe(lng, lat) {
  if (!settings.globe) return false;
  try {
    const t = map.transform;
    if (typeof t.isLocationOccluded === 'function') {
      return t.isLocationOccluded(new maplibregl.LngLat(((lng % 360) + 540) % 360 - 180, lat));
    }
  } catch (e) { /* fall through */ }
  const c = map.getCenter();
  return haversine([c.lng, c.lat], [lng, lat]) / 6371 > 1.43; // radians (~82°)
}

function drawMediaContent(ctx, media, x, y, w, h, timeMs) {
  let src = null;
  if (media.kind === 'gif') src = gifFrameAt(media, timeMs);
  else if (media.kind === 'video' || media.kind === 'live') {
    if (media.video && media.video.readyState >= 2) src = media.video;
    else if (media.posterImg && media.posterImg.complete) src = media.posterImg;
  } else if (media.img && media.img.complete) src = media.img;
  if (!src) src = (media.posterImg && media.posterImg.complete) ? media.posterImg : media.img;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, 5);
  ctx.clip();
  if (src) {
    const sw = src.videoWidth || src.naturalWidth || src.width || media.width || 16;
    const sh = src.videoHeight || src.naturalHeight || src.height || media.height || 9;
    const sc = Math.max(w / sw, h / sh);
    const dw = sw * sc, dh = sh * sc;
    try { ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
    catch { ctx.fillStyle = '#1a2230'; ctx.fillRect(x, y, w, h); }
  } else {
    ctx.fillStyle = '#1a2230'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#9aa8b7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${13}px "Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif`;
    ctx.fillText(mediaKindLabel(media.kind), x + w / 2, y + h / 2);
  }
  ctx.restore();
}

function mediaCardGeometry(media, W, H, s) {
  const maxW = W * 0.46, maxH = H * 0.56;
  let ar;
  if (settings.mediaRatio === 'original') {
    ar = (media.width || 1.4) / Math.max(1, media.height || 1);
    ar = clamp(ar, 0.5, 2.25);
  } else {
    const [a, b] = String(settings.mediaRatio).split(':').map(Number);
    ar = a > 0 && b > 0 ? a / b : 1.35;
  }
  const w = Math.min(maxW, maxH * ar);
  const h = w / ar;
  return { w, h, frame: 12 * s, band: 42 * s };
}

function drawMediaCard(ctx, stop, media, index, total, x, y, w, h, frame, band, alpha, rot, timeMs, primary) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 22 * (frame / 12);
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff';
  roundRect(ctx, -w / 2 - frame, -h / 2 - frame, w + frame * 2, h + frame * 2 + band, 3);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  drawMediaContent(ctx, media, -w / 2, -h / 2, w, h, timeMs);
  if (media.kind !== 'image') {
    const label = mediaKindLabel(media.kind);
    const fs = Math.max(9, w * 0.022);
    ctx.font = `700 ${fs}px "Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(6,10,14,.78)';
    roundRect(ctx, -w / 2 + 7, -h / 2 + 7, tw + 12, fs + 8, 4);
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, -w / 2 + 13, -h / 2 + 7 + (fs + 8) / 2);
  }
  const bandY = h / 2 + frame + band / 2 - 2;
  if (primary) {
    ctx.fillStyle = '#262626';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const name = stopLabel(stop);
    const fs = Math.max(10, band * 0.34);
    ctx.font = `600 ${fs}px "Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif`;
    const maxName = w - 74;
    let shown = name;
    while (shown.length > 1 && ctx.measureText(shown).width > maxName) shown = shown.slice(0, -1);
    if (shown !== name) shown = shown.slice(0, -1) + '…';
    ctx.fillText(shown, -w / 2 + 3, bandY);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#777';
    ctx.fillText(`${index + 1} / ${total}`, w / 2 - 3, bandY);
  }
  ctx.restore();
}

function stackTransform(depth, s) {
  const frames = [
    { dx: 0, dy: 0, scale: 1, rot: -0.025 },
    { dx: 38 * s, dy: 18 * s, scale: 0.94, rot: 0.06 },
    { dx: -42 * s, dy: 31 * s, scale: 0.88, rot: -0.09 },
    { dx: 56 * s, dy: 44 * s, scale: 0.82, rot: 0.12 },
  ];
  const d = clamp(depth, 0, frames.length - 1);
  const i = Math.floor(d), j = Math.min(frames.length - 1, i + 1), t = d - i;
  const a = frames[i], b = frames[j];
  return {
    dx: a.dx + (b.dx - a.dx) * t, dy: a.dy + (b.dy - a.dy) * t,
    scale: a.scale + (b.scale - a.scale) * t, rot: a.rot + (b.rot - a.rot) * t,
  };
}

function drawMediaStack(ctx, W, H, s) {
  const stop = anim.mediaStop;
  const stack = (stop && stop.media) || [];
  const n = stack.length;
  if (!n) return;
  const interval = Math.max(1, anim.mediaInterval || 3000);
  const elapsed = Math.max(0, anim.mediaElapsed || 0);
  const fallbackTransition = clamp(Math.round(interval * 0.22), 160, 720);
  const slots = (anim.mediaSlots && anim.mediaSlots.length === n)
    ? anim.mediaSlots
    : stack.map(() => ({ duration: interval, transition: fallbackTransition }));
  let k = 0, local = 0, slot = slots[0], acc = 0;
  for (let i = 0; i < n; i++) {
    const dur = Math.max(1, slots[i].duration || interval);
    if (elapsed < acc + dur || i === n - 1) {
      k = i;
      local = clamp((elapsed - acc) / dur, 0, 1);
      slot = slots[i];
      break;
    }
    acc += dur;
  }
  const slotTime = local * Math.max(1, slot.duration || interval);
  const transition = clamp((slot.transition || fallbackTransition) / Math.max(1, slot.duration || interval), 0, 0.4);
  let incoming = k, outgoing = null, e = 0;
  // Do not wrap the last item back to the first. The final card simply holds
  // until the timeline leaves this stop and starts the next leg.
  const isFinalSlot = k === n - 1;
  if (n > 1 && !isFinalSlot && transition > 0 && local > 1 - transition) {
    outgoing = k;
    incoming = (k + 1) % n;
    e = (local - (1 - transition)) / transition;
  }
  const topMedia = stack[incoming];
  if (topMedia && (topMedia.kind === 'video' || topMedia.kind === 'live')) activateMediaVideo(topMedia);
  else pauseMediaVideos();

  const cx = W / 2, cy = H / 2 - 4 * s;
  const geometry = idx => mediaCardGeometry(stack[idx], W, H, s);
  const shift = e > 0 ? 1 - e : 0;
  const order = [];
  for (let d = 0; d < Math.min(4, n); d++) {
    const idx = (incoming + d) % n;
    if (outgoing === idx) continue;
    order.push({ idx, depth: d });
  }
  // The outgoing card fades into the bottom of the pile while a copy slides
  // off the top; the incoming card rises from depth 1 to depth 0.
  if (outgoing != null) {
    const cfg = stackTransform(Math.min(3, n - 1), s);
    const g = geometry(outgoing);
    drawMediaCard(ctx, stop, stack[outgoing], outgoing, n, cx + cfg.dx, cy + cfg.dy,
      g.w * cfg.scale, g.h * cfg.scale, g.frame, g.band, e * .9, cfg.rot, slotTime, false);
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const item = order[i];
    const cfg = stackTransform(item.depth + shift, s);
    const g = geometry(item.idx);
    drawMediaCard(ctx, stop, stack[item.idx], item.idx, n, cx + cfg.dx, cy + cfg.dy,
      g.w * cfg.scale, g.h * cfg.scale, g.frame, g.band, 1, cfg.rot, slotTime, item.idx === incoming);
  }
  if (outgoing != null) {
    const cfg = stackTransform(0, s);
    const g = geometry(outgoing);
    drawMediaCard(ctx, stop, stack[outgoing], outgoing, n,
      cx + cfg.dx + 54 * s * e, cy + cfg.dy + 88 * s * e,
      g.w * cfg.scale * (1 - .05 * e), g.h * cfg.scale * (1 - .05 * e), g.frame, g.band,
      1 - e, cfg.rot + .12 * e, slotTime, false);
  }
}

function drawCustomMarker(ctx, x, y, s, icon, leg) {
  if (!icon) return false;
  const px = clamp(Number(icon.size) || 48, 16, 140) * s;
  const tr = customIconTransform(icon, leg, anim.heading);
  ctx.save();
  ctx.translate(x, y);
  if (tr.rotation) ctx.rotate(tr.rotation * Math.PI / 180);
  if (tr.flip) ctx.scale(-1, 1);
  ctx.shadowColor = 'rgba(0,0,0,.42)';
  ctx.shadowBlur = 8 * s;
  ctx.shadowOffsetY = 3 * s;
  if (icon.kind === 'emoji') {
    ctx.font = `${px * 0.92}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon.emoji || '🚗', 0, 0);
    ctx.restore();
    return true;
  }
  let src = null;
  if (icon.kind === 'gif') src = icon.frames ? gifFrameAt(icon, anim.clockMs || 0, true) : icon.img;
  else src = icon.img;
  if (!src || (src.tagName === 'IMG' && (!src.complete || !src.naturalWidth))) { ctx.restore(); return false; }
  const iw = src.videoWidth || src.naturalWidth || src.width || 1;
  const ih = src.videoHeight || src.naturalHeight || src.height || 1;
  const scale = Math.min(px / iw, px / ih);
  const w = iw * scale, h = ih * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

function drawScene(ctx, W, H, dpr) {
  const s = dpr;
  const accent = settings.accent;

  // ---- city labels + every waypoint (waypoints stay above the city layer) ----
  drawCityLabels(ctx, W, H, dpr);
  drawWaypoints(ctx, W, H, dpr);

  // ---- arrival ripple (timeline-driven) ----
  if (anim.pulse && !occludedByGlobe(anim.pulse.lng, anim.pulse.lat)) {
    const eo = anim.pulse.k;
    const [px, py] = project(anim.pulse.lng, anim.pulse.lat, dpr);
    ctx.beginPath(); ctx.arc(px, py, (9 + 42 * eo) * s, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(accent, 0.5 * (1 - eo)); ctx.lineWidth = 3 * s; ctx.stroke();
  }

  // ---- moving transport marker: clean glyph with a cast shadow.
  // The plane flies "in 3D": it grows with simulated altitude while its
  // shadow drops away, spreads and fades — ground vehicles keep a tight
  // grounded shadow. No outline; the shadow provides the separation. ----
  if (anim.marker && (anim.phase === 'leg' || anim.phase === 'pause')) {
    const [x, y] = project(anim.marker[0], anim.marker[1], dpr);
    const leg = anim.legs[anim.legIndex] || null;
    const customIcon = leg && leg.to && leg.to.icon;
    if (!(customIcon && drawCustomMarker(ctx, x, y, s, customIcon, leg))) {
      const mode = MODES[anim.markerMode] || {};
      const alt = mode.directional ? (anim.alt || 0) : 0;
      const side = (mode.directional ? 34 : 29) * s * (1 + 0.45 * alt);
      const rot = mode.directional && anim.heading != null ? anim.heading * Math.PI / 180 : 0;
      // white glyph: contrasts with the accent trail underneath and with any
      // basemap; a thin dark rim keeps it readable on light styles too
      const icon = iconImage(anim.markerMode, '#ffffff');
      const rim = iconImage(anim.markerMode, '#22303f');
      const shade = iconImage(anim.markerMode, '#000000');
      if (icon.complete && icon.naturalWidth && rim.complete && shade.complete) {
        ctx.imageSmoothingQuality = 'high';
        // cast shadow: separates, blurs and fades as the plane climbs
        const drop = (3 + 15 * alt) * s;
        ctx.save();
        ctx.translate(x + drop * 0.45, y + drop);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.34 - 0.18 * alt;
        ctx.filter = `blur(${(1.5 + 3.5 * alt) * s}px)`;
        ctx.drawImage(shade, -side / 2, -side / 2, side, side);
        ctx.restore();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        const o = 1.4 * s;
        ctx.globalAlpha = 0.9;
        for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o]]) {
          ctx.drawImage(rim, -side / 2 + dx, -side / 2 + dy, side, side);
        }
        ctx.globalAlpha = 1;
        ctx.drawImage(icon, -side / 2, -side / 2, side, side);
        ctx.restore();
      }
    }
  }

  // ---- title card (intro) ----
  if (anim.titleAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = anim.titleAlpha;
    ctx.fillStyle = 'rgba(7,10,14,.45)'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = anim.titleAlpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 18 * s;
    const tfs = (settings.aspect === '9:16' ? 46 : 54) * s;
    ctx.font = `800 ${tfs}px "Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif`;
    wrapText(ctx, settings.title || '', W / 2, H / 2 - tfs * 0.2, W * 0.86, tfs * 1.15);
    if (settings.subtitle) {
      ctx.shadowBlur = 10 * s;
      ctx.font = `500 ${tfs * 0.42}px "Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif`;
      ctx.fillStyle = hexA(accent, 1);
      ctx.fillText(settings.subtitle, W / 2, H / 2 + tfs * 0.75);
    }
    ctx.restore();
    ctx.textAlign = 'left';
  }

  // ---- stop media stack (images / GIF / video / Live) ----
  if (anim.phase === 'media' && anim.mediaStop) {
    drawMediaStack(ctx, W, H, s);
  }

  // ---- lower-third caption ----
  if (anim.caption && (anim.phase === 'leg' || anim.phase === 'pause')) {
    let fs = (settings.aspect === '9:16' ? 17 : 19) * s;
    ctx.font = `600 ${fs}px "Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif`;
    let tw = ctx.measureText(anim.caption).width;
    const maxTextW = W * 0.74 - 32 * s;
    if (tw > maxTextW) {
      fs = Math.max(10 * s, fs * maxTextW / tw);
      ctx.font = `600 ${fs}px "Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif`;
      tw = ctx.measureText(anim.caption).width;
    }
    const px = 16 * s, h = fs + 18 * s;
    const bx = 26 * s, by = H - h - 26 * s;
    roundRect(ctx, bx, by, tw + px * 2, h, 10 * s);
    ctx.fillStyle = hexA(accent, 0.92); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.fillText(anim.caption, bx + px, by + h / 2);
  }

  // ---- optional custom watermark (off by default) ----
  if (settings.watermark) {
    const fs = 14 * s;
    ctx.font = `600 ${fs}px "Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif`;
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    ctx.fillText(settings.watermark, W - 22 * s, H - 22 * s);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}

/* small canvas helpers */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapText(ctx, text, cx, cy, maxW, lh) {
  text = String(text || '');
  const hasSpace = /\s/.test(text);
  const units = hasSpace ? text.split(/\s+/) : [...text];
  const sep = hasSpace ? ' ' : '';
  let lineStr = '', lines = [];
  for (const w of units) {
    const test = lineStr ? lineStr + sep + w : w;
    if (ctx.measureText(test).width > maxW && lineStr) { lines.push(lineStr); lineStr = w; }
    else lineStr = test;
  }
  if (lineStr) lines.push(lineStr);
  const startY = cy - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lh));
}
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ============================================================ music */
function startMusic() {
  const el = $('#music');
  if (!el.src) return;
  el.currentTime = 0;
  el.volume = 0.85;
  el.play().catch(() => {});
}
function stopMusic() { const el = $('#music'); if (el.src) el.pause(); }

/* ============================================================ recording */
function pickMime() {
  const wantMp4 = settings.format === 'mp4';
  const candidates = wantMp4
    ? ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.42E01E', 'video/mp4',
       'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm']
    : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

function startRecorder() {
  recordedChunks = [];
  const fps = 30;
  const stream = $('#output').captureStream(fps);

  const music = $('#music');
  if (music.src) {
    try {
      const as = music.captureStream ? music.captureStream() : (music.mozCaptureStream && music.mozCaptureStream());
      if (as) as.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch (e) { /* record silent video */ }
  }

  const mime = pickMime();
  mediaRecorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 14_000_000 });
  mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) recordedChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    const type = mediaRecorder.mimeType || 'video/webm';
    const ext = type.includes('mp4') ? 'mp4' : 'webm';
    publishVideo(new Blob(recordedChunks, { type }), ext);
  };
  mediaRecorder.start();
}
function stopRecorder() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
}

/* ============================================================ layout / aspect */
function layoutStage() {
  const area = $('#stage-inner');
  const r = area.getBoundingClientRect();
  const [aw, ah] = settings.aspect.split(':').map(Number);
  const ar = aw / ah;
  let w = r.width, h = w / ar;
  if (h > r.height) { h = r.height; w = h * ar; }
  const box = $('#mapbox');
  box.style.width = Math.floor(w) + 'px';
  box.style.height = Math.floor(h) + 'px';
  if (map) map.resize();
}

/* ============================================================ wiring */
function setControls(playing) {
  $('#btn-play').disabled = playing;
  $('#btn-record').disabled = playing;
  $('#btn-stop').disabled = !playing;
}
function syncSettingsFromUI() {
  settings.title = $('#inp-title').value;
  settings.subtitle = $('#inp-subtitle').value;
  settings.watermark = $('#inp-watermark').value.trim();
  settings.accent = $('#inp-accent').value;
  settings.pace = parseFloat($('#rng-pace').value);
  settings.mediaInterval = parseFloat($('#rng-media-interval').value) || 3;
  settings.mediaRatio = MEDIA_RATIOS.includes($('#sel-media-ratio').value) ? $('#sel-media-ratio').value : 'original';
  settings.labels = $('#chk-labels').checked;
  settings.cities = $('#chk-cities').checked;
  settings.borders = $('#chk-borders').checked;
  settings.cityLevel = $('#sel-city-level').value;
  settings.roads = $('#chk-roads').checked;
  settings.pitch = $('#chk-pitch').checked;
  settings.glow = $('#chk-glow').checked;
  settings.globe = $('#chk-globe').checked;
  settings.format = $('#sel-format').value;
  settings.quality = parseInt($('#sel-quality').value, 10);
  const rootInput = $('#inp-resource-root');
  if (rootInput) settings.resourceRoot = cleanPathInput(rootInput.value);
}

/* ============================================================ language + region */
function paceLabel() {
  if (settings.pace < 0.8) return t('paceSlow');
  if (settings.pace > 1.4) return t('paceFast');
  return t('paceNormal');
}

function updateMediaIntervalLabel() {
  const el = $('#rng-media-interval');
  if (!el) return;
  const n = Number(el.value) || settings.mediaInterval || 3;
  $('#media-interval-val').textContent = t('mediaIntervalValue', { n: Number(n.toFixed(1)) });
}

function applyLanguage(initial = false) {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
  document.body.dataset.lang = LANG;
  document.title = t('docTitle');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val !== key) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  });
  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    el.setAttribute('label', t(el.dataset.i18nLabel));
  });

  $('#lang-label').textContent = LANG === 'zh' ? 'EN' : '中';
  $('#btn-lang').title = t('switchLang');
  $('#btn-lang').setAttribute('aria-label', t('switchLang'));

  const titleInput = $('#inp-title');
  const subInput = $('#inp-subtitle');
  if (initial || !titleInput.dataset.edited) titleInput.value = t('defaultTitle');
  if (initial || !subInput.dataset.edited) subInput.value = t('defaultSubtitle');
  if (!$('#music').src) $('#music-name').textContent = t('none');
  else if (musicFileName) $('#music-name').textContent = musicFileName;
  if (lastVideo && !$('#btn-download').classList.contains('hidden')) {
    $('#dl-label').textContent = t('downloadLabel', { ext: lastVideo.ext, size: lastVideo.size });
  }
  $('#pace-val').textContent = paceLabel();
  updateMediaIntervalLabel();
  updateRegionUI(false);
  renderStops();
  renderCustomPlaces();
  schedulePlaceLayer();
}

function updateRegionUI(announce) {
  document.querySelectorAll('#region-switch .seg-btn').forEach(btn => {
    const active = btn.dataset.region === settings.region;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  $('#region-badge').textContent = settings.region === 'cn' ? 'CN' : 'GLOBAL';
  document.body.dataset.region = settings.region;
  if (announce) toast(settings.region === 'cn' ? t('regionSwitchedCn') : t('regionSwitchedGlobal'));
}

function setRegion(region, announce = true) {
  if (region !== 'cn' && region !== 'global') return;
  settings.region = region;
  updateRegionUI(announce);

  if (map) {
    try {
      if (region === 'cn') {
        map.setMaxBounds(CHINA_BOUNDS);
        map.setMinZoom(2.8);
      } else {
        map.setMaxBounds(null);
        map.setMinZoom(0);
      }
    } catch (e) { console.warn('maxBounds update failed:', e); }

    // Keep the basemap sensible for the selected region.
    let nextStyle = settings.style;
    if (region === 'cn' && !isChinaStyle(nextStyle)) nextStyle = 'amap';
    if (region === 'global' && nextStyle.startsWith('amap')) nextStyle = 'satellite';
    if (nextStyle !== settings.style) {
      settings.style = nextStyle;
      $('#sel-style').value = nextStyle;
      map.setStyle(styleSpec(nextStyle), { diff: false });
    } else {
      ensureChinaOverlay();
      setBoundaryVisibility();
    }

    if (stops.length) fitToStops(false);
    else if (region === 'cn') map.flyTo({ center: [104.2, 35.6], zoom: 3.9, duration: 600 });
    else map.flyTo({ center: [5, 44], zoom: 3.4, duration: 600 });
  }
  $('#search-results').classList.add('hidden');
  savePrefs();
  schedulePlaceLayer();
}

/* ============================================================ wiring */
function applyInitialControls() {
  if (settings.region === 'cn' && !isChinaStyle(settings.style)) settings.style = 'amap';
  if (settings.region === 'global' && settings.style.startsWith('amap')) settings.style = 'satellite';
  $('#sel-style').value = settings.style;
  if (!$('#sel-style').value) { settings.style = 'amap'; $('#sel-style').value = 'amap'; }
  $('#sel-city-level').value = String(settings.cityLevel || 'auto');
  if (!$('#sel-city-level').value) { settings.cityLevel = 'auto'; $('#sel-city-level').value = 'auto'; }
  $('#chk-cities').checked = !!settings.cities;
  $('#chk-borders').checked = !!settings.borders;
  $('#chk-labels').checked = !!settings.labels;
  $('#chk-globe').checked = !!settings.globe;
  $('#chk-pitch').checked = !!settings.pitch;
  $('#chk-roads').checked = !!settings.roads;
  $('#chk-glow').checked = !!settings.glow;
  $('#rng-media-interval').value = String(settings.mediaInterval || 3);
  $('#sel-media-ratio').value = settings.mediaRatio;
  const rootInput = $('#inp-resource-root');
  if (rootInput) rootInput.value = settings.resourceRoot || '';
  $('#pace-val').textContent = paceLabel();
  updateMediaIntervalLabel();
  updateRegionUI(false);
  updatePathStatus();
}

function wire() {
  $('#btn-add').onclick = () => doSearch(true);
  let searchTimer = 0;
  const searchInput = $('#inp-search');
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchSeq++;
    const q = searchInput.value.trim();
    if (!q) { $('#search-results').classList.add('hidden'); return; }
    searchTimer = setTimeout(doSearch, 260);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSearchActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearchActive(-1); }
    else if (e.key === 'Escape') { $('#search-results').classList.add('hidden'); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const items = currentSearchResults();
      const active = window._ttSearchActive;
      if (items.length && active >= 0) chooseSearchResult(items[active]);
      else doSearch(true);
    }
  });
  $('#btn-clear').onclick = () => { disposeAllMedia(); stops = []; afterStopsChange(); };

  $('#btn-add-custom').onclick = submitCustomPlace;
  $('#btn-cancel-custom').onclick = resetCustomEditor;
  $('#btn-save-custom').onclick = saveCustomPlacesFile;
  $('#btn-load-custom').onclick = () => $('#file-custom').click();
  $('#file-custom').onchange = e => {
    const f = e.target.files[0]; e.target.value = '';
    if (f) loadCustomPlacesFile(f);
  };
  $('#btn-save-config').onclick = saveConfigFile;
  $('#btn-load-config').onclick = () => $('#file-config').click();
  $('#file-config').onchange = e => {
    const f = e.target.files[0]; e.target.value = '';
    if (f) loadConfigFile(f);
  };
  $('#inp-resource-root').addEventListener('input', e => {
    settings.resourceRoot = cleanPathInput(e.target.value);
    savePrefs();
  });
  $('#btn-pick-root').onclick = pickResourceRoot;
  $('#btn-resolve-paths').onclick = bindAllResourcePaths;
  $('#res-modal-x').onclick = closeResModal;
  $('#res-modal').addEventListener('click', e => {
    if (e.target === $('#res-modal')) closeResModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && resModalStack.length) closeResModal();
  });

  $('#btn-lang').onclick = () => {
    LANG = LANG === 'zh' ? 'en' : 'zh';
    applyLanguage();
    settings.title = $('#inp-title').value;
    settings.subtitle = $('#inp-subtitle').value;
    savePrefs();
    toast(t('langSwitched'));
  };

  document.querySelectorAll('#region-switch .seg-btn').forEach(btn => {
    btn.onclick = () => setRegion(btn.dataset.region, true);
  });

  $('#btn-build').onclick = buildFromText;
  $('#btn-import').onclick = () => $('#file-route').click();
  $('#file-route').onchange = e => { if (e.target.files[0]) importRouteFile(e.target.files[0]); e.target.value = ''; };

  $('#inp-title').addEventListener('input', e => { e.target.dataset.edited = '1'; settings.title = e.target.value; });
  $('#inp-subtitle').addEventListener('input', e => { e.target.dataset.edited = '1'; settings.subtitle = e.target.value; });

  $('#file-photo').onchange = e => {
    const files = [...e.target.files];
    e.target.value = '';
    const s = stops.find(x => x.id === photoTargetId);
    if (!files.length || !s) return;
    addMediaFiles(s, files);
  };

  $('#file-icon').onchange = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    const s = stops.find(x => x.id === iconTargetId);
    if (!file || !s) return;
    loading(true, t('iconLoading'));
    try {
      const previous = s.icon;
      const next = await createIconFromFile(file);
      if (previous) {
        next.size = previous.size;
        next.baseFacing = previous.baseFacing;
        next.autoFlip = previous.autoFlip;
        next.rotate = previous.rotate;
      }
      s.icon = next;
      renderStops();
      toast(t('iconLoaded', { name: file.name }));
    } catch (err) {
      console.warn('icon load failed:', err);
      toast(err && err.message === 'icon too large' ? t('iconTooLarge') : t('iconInvalid'));
    } finally {
      loading(false);
    }
  };

  $('#btn-music').onclick = () => $('#file-music').click();
  $('#file-music').onchange = async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    musicFileName = f.name;
    musicSize = f.size || 0;
    musicPath = '';
    $('#music').src = URL.createObjectURL(f);
    $('#music-name').textContent = f.name;
    $('#btn-music-clear').classList.remove('hidden');
    $('#btn-music-path').classList.remove('hidden');
    // Link the track to the file on disk when the resource folder is known.
    if (settings.resourceRoot) {
      const guess = fsJoin(settings.resourceRoot, f.webkitRelativePath || f.name);
      const st = await fsStat(guess);
      if (st && st.exists && st.isFile && (!st.size || !musicSize || Math.abs(st.size - musicSize) <= 2)) {
        musicPath = guess;
        musicSize = st.size || musicSize;
      }
    }
    updatePathStatus();
  };
  $('#btn-music-path').onclick = openMusicPathDialog;
  $('#btn-music-clear').onclick = () => clearMusic();

  $('#btn-play').onclick = () => play(false);
  $('#btn-record').onclick = () => { $('#btn-download').classList.add('hidden'); play(true); };
  $('#btn-stop').onclick = stopPlay;

  $('#inp-accent').oninput = e => {
    settings.accent = e.target.value;
    document.documentElement.style.setProperty('--accent', settings.accent);
    TRAIL_LAYERS.forEach(lid => { if (map && map.getLayer(lid)) map.setPaintProperty(lid, 'line-color', settings.accent); });
    schedulePlaceLayer();
  };
  $('#sel-style').onchange = e => {
    settings.style = e.target.value;
    savePrefs();
    if (map) map.setStyle(styleSpec(settings.style), { diff: false });
  };
  $('#sel-aspect').onchange = e => { settings.aspect = e.target.value; layoutStage(); };
  $('#chk-globe').onchange = e => { settings.globe = e.target.checked; applyProjection(); };
  $('#chk-pitch').onchange = e => { settings.pitch = e.target.checked; map.easeTo({ pitch: settings.pitch ? 50 : 0, duration: 500 }); };
  $('#chk-labels').onchange = e => { settings.labels = e.target.checked; schedulePlaceLayer(); };
  $('#chk-cities').onchange = e => { settings.cities = e.target.checked; savePrefs(); schedulePlaceLayer(); };
  $('#chk-borders').onchange = e => {
    settings.borders = e.target.checked; savePrefs();
    ensureChinaOverlay();
    setBoundaryVisibility();
  };
  $('#sel-city-level').onchange = e => {
    settings.cityLevel = e.target.value;
    savePrefs();
    schedulePlaceLayer();
  };
  $('#chk-roads').onchange = e => settings.roads = e.target.checked;
  $('#chk-glow').onchange = e => {
    settings.glow = e.target.checked;
    if (map) map.setStyle(styleSpec(settings.style), { diff: false });
  };
  $('#rng-pace').oninput = e => {
    settings.pace = parseFloat(e.target.value);
    $('#pace-val').textContent = paceLabel();
  };
  $('#rng-media-interval').oninput = e => {
    settings.mediaInterval = parseFloat(e.target.value);
    updateMediaIntervalLabel();
  };
  $('#sel-media-ratio').onchange = e => {
    settings.mediaRatio = MEDIA_RATIOS.includes(e.target.value) ? e.target.value : 'original';
    savePrefs();
  };
  $('#sel-format').onchange = e => settings.format = e.target.value;
  $('#sel-quality').onchange = e => settings.quality = parseInt(e.target.value, 10);

  document.addEventListener('click', e => {
    if (!e.target.closest('.search')) $('#search-results').classList.add('hidden');
  });

  // collapsible sidebar + mobile overlay
  const setNav = hidden => document.body.classList.toggle('nav-hidden', hidden);
  $('#nav-toggle').onclick = () => document.body.classList.toggle('nav-hidden');
  $('#nav-close').onclick = () => setNav(true);
  $('#scrim').onclick = () => setNav(true);
  // resize the map once the slide animation settles (stage width changed on desktop)
  $('#sidebar').addEventListener('transitionend', e => {
    if (e.propertyName === 'margin-left' || e.propertyName === 'transform') layoutStage();
  });

  // keep a sensible default when crossing the mobile breakpoint
  const mq = window.matchMedia('(max-width:820px)');
  let wasMobile = mq.matches;
  window.addEventListener('resize', () => {
    if (mq.matches !== wasMobile) { wasMobile = mq.matches; setNav(mq.matches); }
    layoutStage();
  });
}

/* ============================================================ boot */
function boot() {
  window.addEventListener('unhandledrejection', e => console.warn('unhandled rejection:', e.reason));
  probeFileApi();
  applyLanguage(true);
  settings.title = $('#inp-title').value;
  settings.subtitle = $('#inp-subtitle').value;
  document.documentElement.style.setProperty('--accent', settings.accent);
  if (window.matchMedia('(max-width:820px)').matches) document.body.classList.add('nav-hidden');
  applyInitialControls();
  wire();
  renderStops();
  initMap();
  layoutStage();
  loadChinaData();
  setTimeout(() => { layoutStage(); setRegion(settings.region, false); schedulePlaceLayer(); }, 350);
}
boot();
