import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 8742;
const host = process.env.HOST || '127.0.0.1';

/* ---------------------------------------------------------------------------
   Local resource API
   ---------------------------------------------------------------------------
   A project config stores *links* (absolute paths) to the media, icons and
   music used by the trip instead of embedding the bytes. A browser can never
   learn the path of a file picked in the OS dialog, so this little server is
   what makes those links real: it resolves names to paths, reads the files
   back and streams them to the page with Range support (needed by <video>).

   The API is read-only, bound to 127.0.0.1, restricted to media/config
   extensions and guarded by a per-process token. It never writes to disk.
--------------------------------------------------------------------------- */

const TOKEN = crypto.randomBytes(18).toString('base64url');
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

const MEDIA_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.bmp', '.svg', '.ico', '.heic', '.heif',
  '.mp4', '.m4v', '.mov', '.webm', '.ogv',
  '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.opus',
]);
const DATA_EXT = new Set(['.json', '.geojson']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.opus': 'audio/ogg',
  '.woff2': 'font/woff2',
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function isAbsolute(p) {
  return typeof p === 'string' && (path.isAbsolute(p) || /^[a-zA-Z]:[\\/]/.test(p) || /^\\\\/.test(p));
}

function extOf(p) {
  return path.extname(p).toLowerCase();
}

// Only loopback host names may use the resource API. Together with the token
// this blocks cross-site reads (including DNS-rebinding tricks).
function hostIsLocal(req) {
  let name = String(req.headers.host || '').toLowerCase();
  if (name.startsWith('[')) name = name.slice(0, name.indexOf(']') + 1);
  else name = name.split(':')[0];
  return LOCAL_HOSTS.has(name);
}

function tokenOk(req, url) {
  const supplied = String(url.searchParams.get('t') || req.headers['x-triptrail-token'] || '');
  if (!supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function homeRoots() {
  const home = os.homedir();
  const out = [];
  const add = (kind, p) => {
    try { if (fs.statSync(p).isDirectory()) out.push({ kind, path: p }); } catch { /* missing */ }
  };
  add('home', home);
  add('pictures', path.join(home, 'Pictures'));
  add('videos', path.join(home, 'Videos'));
  add('music', path.join(home, 'Music'));
  add('desktop', path.join(home, 'Desktop'));
  add('downloads', path.join(home, 'Downloads'));
  add('documents', path.join(home, 'Documents'));
  if (process.platform === 'win32') {
    for (let i = 0; i < 26; i++) {
      const drive = `${String.fromCharCode(65 + i)}:\\`;
      try { if (fs.statSync(drive).isDirectory()) out.push({ kind: 'drive', path: drive }); } catch { /* no drive */ }
    }
  } else {
    out.push({ kind: 'root', path: '/' });
  }
  return out;
}

function nameSorter(a, b) {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

async function listDirectory(res, dir) {
  if (!isAbsolute(dir)) return sendJson(res, 400, { error: 'absolute path required' });
  const st = await fsp.stat(dir).catch(() => null);
  if (!st || !st.isDirectory()) return sendJson(res, 404, { error: 'not a directory' });
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); }
  catch { return sendJson(res, 403, { error: 'cannot read directory' }); }
  const dirs = [];
  const files = [];
  for (const d of entries) {
    if (d.name.startsWith('$') || d.name === 'System Volume Information' || d.name === 'node_modules') continue;
    const full = path.join(dir, d.name);
    if (d.isDirectory()) { dirs.push({ name: d.name, path: full, dir: true }); continue; }
    if (!d.isFile()) continue;
    const ext = extOf(d.name);
    if (!MEDIA_EXT.has(ext) && !DATA_EXT.has(ext)) continue;
    let size = 0;
    try { size = (await fsp.stat(full)).size; } catch { /* vanished */ }
    files.push({ name: d.name, path: full, dir: false, size, ext });
  }
  dirs.sort(nameSorter);
  files.sort(nameSorter);
  const parent = path.dirname(dir);
  sendJson(res, 200, {
    path: dir,
    parent: parent && parent !== dir ? parent : '',
    entries: [...dirs, ...files],
  });
}

async function serveFile(req, res, file) {
  if (!isAbsolute(file)) return sendJson(res, 400, { error: 'absolute path required' });
  const ext = extOf(file);
  if (!MEDIA_EXT.has(ext) && !DATA_EXT.has(ext)) return sendJson(res, 403, { error: 'unsupported file type' });
  const st = await fsp.stat(file).catch(() => null);
  if (!st || !st.isFile()) return sendJson(res, 404, { error: 'not found' });

  const total = st.size;
  const type = MIME[ext] || 'application/octet-stream';
  const headers = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };
  const range = String(req.headers.range || '');
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (m && (m[1] || m[2])) {
    let start;
    let end;
    if (!m[1]) {
      const suffix = Number(m[2]);
      if (!suffix) { res.writeHead(416, { 'Content-Range': `bytes */${total}` }); res.end(); return; }
      start = Math.max(0, total - suffix);
      end = total - 1;
    } else {
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` });
      res.end();
      return;
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
    return;
  }

  res.writeHead(200, { ...headers, 'Content-Length': total });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

/* Search a bounded set of folders for the given file names. This lets a config
   record absolute paths even when the user forgot to set the resource folder. */
async function resolveNames(dirs, wanted, maxEntries = 80000, deadlineMs = 4500) {
  const started = Date.now();
  const queue = [];
  for (const d of dirs) if (isAbsolute(d)) queue.push({ dir: d, depth: 0 });
  const seen = new Set();
  const skipDirs = new Set([
    'node_modules', 'System Volume Information', '$RECYCLE.BIN', 'AppData', 'Windows',
    'Program Files', 'Program Files (x86)', 'ProgramData', '.git', '$WinREAgent',
  ]);
  const byName = new Map();
  let scanned = 0;
  let timedOut = false;
  while (queue.length) {
    if (scanned > maxEntries || Date.now() - started > deadlineMs) { timedOut = true; break; }
    const { dir, depth } = queue.shift();
    if (seen.has(dir)) continue;
    seen.add(dir);
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const d of entries) {
      if (scanned++ > maxEntries) { timedOut = true; break; }
      if (d.isDirectory()) {
        if (depth < 6 && !skipDirs.has(d.name) && !d.name.startsWith('.')) queue.push({ dir: path.join(dir, d.name), depth: depth + 1 });
        continue;
      }
      if (!d.isFile()) continue;
      const key = d.name.toLowerCase();
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(path.join(dir, d.name));
    }
  }

  const matches = {};
  for (const f of wanted) {
    const key = String(f.name || '').toLowerCase();
    const list = byName.get(key);
    if (!list || !list.length) continue;
    // Names repeat across folders (IMG_0001.jpg), so a known size must match;
    // without a size, the first hit is the best available guess.
    const size = Number(f.size) || 0;
    let picked = '';
    for (const candidate of list) {
      const st = await fsp.stat(candidate).catch(() => null);
      if (!st) continue;
      if (size) {
        if (Math.abs(st.size - size) <= 2) { picked = candidate; break; }
      } else if (!picked) {
        picked = candidate;
      }
    }
    if (picked) matches[f.name] = picked;
  }
  return { matches, scanned, timedOut };
}

function readJsonBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  if (!hostIsLocal(req)) return sendJson(res, 403, { error: 'local host only' });
  const ping = url.pathname === '/api/fs/ping';
  if (!ping && !tokenOk(req, url)) return sendJson(res, 403, { error: 'bad token' });

  try {
    if (ping) {
      return sendJson(res, 200, {
        ok: true,
        token: TOKEN,
        platform: process.platform,
        separator: path.sep,
        home: os.homedir(),
        roots: homeRoots(),
      });
    }
    if (url.pathname === '/api/fs/list') {
      const p = url.searchParams.get('path') || '';
      if (!p) return sendJson(res, 200, { path: '', parent: '', roots: homeRoots(), entries: [] });
      return await listDirectory(res, p);
    }
    if (url.pathname === '/api/fs/stat') {
      const p = url.searchParams.get('path') || '';
      if (!isAbsolute(p)) return sendJson(res, 400, { error: 'absolute path required' });
      const st = await fsp.stat(p).catch(() => null);
      if (!st) return sendJson(res, 200, { exists: false });
      return sendJson(res, 200, {
        exists: true, isFile: st.isFile(), isDirectory: st.isDirectory(),
        size: st.size, mtimeMs: st.mtimeMs,
      });
    }
    if (url.pathname === '/api/fs/file') {
      return await serveFile(req, res, url.searchParams.get('path') || '');
    }
    if (url.pathname === '/api/fs/resolve' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const dirs = Array.isArray(body.dirs) ? body.dirs.slice(0, 8) : [];
      const wanted = Array.isArray(body.files) ? body.files.filter(f => f && f.name).slice(0, 300) : [];
      const out = await resolveNames(dirs, wanted);
      return sendJson(res, 200, out);
    }
    return sendJson(res, 404, { error: 'unknown api' });
  } catch (e) {
    return sendJson(res, 500, { error: String((e && e.message) || e) });
  }
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || host}`);
    if (url.pathname.startsWith('/api/fs/')) {
      handleApi(req, res, url);
      return;
    }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const file = path.normalize(path.join(root, pathname));
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(file).pipe(res);
    });
  } catch {
    res.writeHead(400); res.end('Bad request');
  }
});

server.listen(port, host, () => {
  console.log(`TripTrail CN running at http://${host}:${port}`);
});
