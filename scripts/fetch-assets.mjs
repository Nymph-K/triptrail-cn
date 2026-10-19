import { mkdir, writeFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const files = [
  ['https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json', 'data/china-provinces.raw.json'],
  ['https://download.geonames.org/export/dump/CN.zip', 'data/CN.zip'],
  ['https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.js', 'vendor/maplibre/maplibre-gl.js'],
  ['https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.css', 'vendor/maplibre/maplibre-gl.css'],
  ['https://unpkg.com/maplibre-gl@5.6.0/LICENSE.txt', 'vendor/maplibre/LICENSE.txt'],
  ['https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm', 'vendor/mp4-muxer.mjs'],
];

await mkdir('data', { recursive: true });
await mkdir('vendor/maplibre', { recursive: true });

for (const [url, out] of files) {
  try {
    const s = await stat(out);
    if (s.size > 1000) {
      console.log(`skip ${out} (${s.size} bytes)`);
      continue;
    }
  } catch {}
  process.stdout.write(`fetch ${url} ... `);
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const b = Buffer.from(await r.arrayBuffer());
  await writeFile(out, b);
  console.log(`${b.length} bytes`);
}

// GeoNames ships a zip; extract CN.txt next to it for the data builder.
if (!existsSync('data/geonames/CN.txt') && existsSync('data/CN.zip')) {
  await mkdir('data/geonames', { recursive: true });
  try {
    execFileSync('tar', ['-xf', 'data/CN.zip', '-C', 'data/geonames'], { stdio: 'inherit' });
    console.log('extracted data/geonames/CN.txt');
  } catch {
    console.log('Could not auto-extract data/CN.zip; please extract it into data/geonames/.');
  }
}
