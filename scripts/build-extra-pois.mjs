import fs from 'node:fs';
import { pinyin } from 'pinyin-pro';

const API = 'https://api.github.com/repos/james0618-yang/travel-top10/git/trees/HEAD?recursive=1';
const RAW = 'https://raw.githubusercontent.com/james0618-yang/travel-top10/HEAD/';
const headers = { 'User-Agent': 'triptrail-cn-data-builder' };

const tree = await (await fetch(API, { headers })).json();
const files = (tree.tree || []).filter(x => x.path.startsWith('data/') && x.path.endsWith('.json') && x.path !== 'data/all.json');
const records = [];
for (const f of files) {
  const city = decodeURIComponent(f.path.replace(/^data\//, '').replace(/\.json$/, ''));
  const r = await fetch(RAW + encodeURI(f.path), { headers });
  if (!r.ok) { console.warn('skip', f.path, r.status); continue; }
  const j = await r.json();
  for (const a of j.attractions || []) {
    if (!a.name || !Number.isFinite(a.lng) || !Number.isFinite(a.lat)) continue;
    const address = Array.isArray(a.address) ? a.address.join(' ') : (a.address || '');
    records.push({
      name: a.name, city, address, type: a.type || '风景名胜',
      lng: a.lng, lat: a.lat,
    });
  }
}
console.log('fetched', records.length, 'from', files.length, 'cities');

// WGS-84 -> GCJ-02 so these POIs line up with AMap/DataV layers in China mode.
const outOfChina = (lng, lat) => lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
function transLat(x, y) {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  r += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
  r += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
  return r;
}
function transLng(x, y) {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  r += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
  r += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
  return r;
}
function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) return [lng, lat];
  const a = 6378245, ee = 0.00669342162296594323;
  let dLat = transLat(lng - 105, lat - 35);
  let dLng = transLng(lng - 105, lat - 35);
  const radLat = lat / 180 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
  dLng = (dLng * 180) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
  return [lng + dLng, lat + dLat];
}

// Map city -> province using the generated city index.
const cityDb = JSON.parse(fs.readFileSync('data/china-cities.json', 'utf8'));
const cityProvince = new Map();
for (const c of cityDb.cities) {
  if (!cityProvince.has(c.name)) cityProvince.set(c.name, { province: c.province, en: c.provinceEn });
}
const pinyinFallback = name => {
  const py = pinyin(name, { toneType: 'none' }).replace(/\s+/g, ' ').trim();
  return py.replace(/(^|\s)\S/g, c => c.toUpperCase());
};
const pinyinKey = name => pinyin(name, { toneType: 'none' }).replace(/\s+/g, '');
const seen = new Set(cityDb.pois.map(p => p.name));
const pois = [];
for (const r of records) {
  if (seen.has(r.name)) continue;
  seen.add(r.name);
  const [lng, lat] = wgs84ToGcj02(r.lng, r.lat);
  const meta = cityProvince.get(r.city) || { province: r.city, en: r.city };
  pois.push({
    name: r.name,
    en: pinyinFallback(r.name),
    pinyin: pinyinKey(r.name),
    province: meta.province,
    provinceEn: meta.en,
    city: r.city,
    level: 3,
    lng, lat,
    kind: 'poi',
    category: r.type,
    address: r.address,
    aliases: [r.city, r.address].filter(Boolean),
    source: 'amap-poi-top10',
  });
}
fs.writeFileSync('data/china-pois-extra.json', JSON.stringify({
  source: 'https://github.com/james0618-yang/travel-top10',
  coordinateSystem: 'GCJ-02',
  generatedAt: new Date().toISOString(),
  count: pois.length,
  pois,
}));
console.log('extra unique POIs', pois.length);
