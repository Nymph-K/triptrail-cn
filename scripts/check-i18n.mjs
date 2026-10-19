import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('i18n.js', 'utf8'), ctx);
const d = ctx.window.TRIPTRAIL_I18N;
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const used = new Set([...html.matchAll(/data-i18n(?:-placeholder|-title|-aria-label|-label)?="([^"]+)"/g)].map(m => m[1]));
for (const m of app.matchAll(/t\('([^']+)'/g)) used.add(m[1]);
for (const lang of ['zh', 'en']) {
  const keys = new Set(Object.keys(d[lang]));
  console.log(lang, 'keys', keys.size, 'used', used.size, 'missing', [...used].filter(k => !keys.has(k)));
}
