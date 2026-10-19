import fs from 'node:fs';
import path from 'node:path';
import { pinyin } from 'pinyin-pro';

const root = path.resolve('.');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, obj) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj));
  console.log(`${p}: ${(fs.statSync(p).size / 1048576).toFixed(2)} MB`);
};

/* ------------------------------------------------------------------ */
/* 1. Province + prefecture boundaries from DataV (Aliyun)             */
/* ------------------------------------------------------------------ */
const top = readJson('data/china-provinces.raw.json');
const provinces = top.features.filter(f => f.properties && Number.isFinite(Number(f.properties.adcode)) && f.properties.name);
const provinceNames = new Map(provinces.map(f => [Number(f.properties.adcode), f.properties.name]));

const NAME_EN = {
  北京市: ['Beijing', '北京'], 天津市: ['Tianjin', '天津'], 河北省: ['Hebei', '河北'],
  山西省: ['Shanxi', '山西'], 内蒙古自治区: ['Inner Mongolia', '内蒙古'],
  辽宁省: ['Liaoning', '辽宁'], 吉林省: ['Jilin', '吉林'], 黑龙江省: ['Heilongjiang', '黑龙江'],
  上海市: ['Shanghai', '上海'], 江苏省: ['Jiangsu', '江苏'], 浙江省: ['Zhejiang', '浙江'],
  安徽省: ['Anhui', '安徽'], 福建省: ['Fujian', '福建'], 江西省: ['Jiangxi', '江西'],
  山东省: ['Shandong', '山东'], 河南省: ['Henan', '河南'], 湖北省: ['Hubei', '湖北'],
  湖南省: ['Hunan', '湖南'], 广东省: ['Guangdong', '广东'], 广西壮族自治区: ['Guangxi', '广西'],
  海南省: ['Hainan', '海南'], 重庆市: ['Chongqing', '重庆'], 四川省: ['Sichuan', '四川'],
  贵州省: ['Guizhou', '贵州'], 云南省: ['Yunnan', '云南'], 西藏自治区: ['Tibet', '西藏'],
  陕西省: ['Shaanxi', '陕西'], 甘肃省: ['Gansu', '甘肃'], 青海省: ['Qinghai', '青海'],
  宁夏回族自治区: ['Ningxia', '宁夏'], 新疆维吾尔自治区: ['Xinjiang', '新疆'],
  台湾省: ['Taiwan', '台湾'], 香港特别行政区: ['Hong Kong', '香港'], 澳门特别行政区: ['Macau', '澳门'],
};
const PROVINCE_ABBR = {
  北京市: '京', 天津市: '津', 河北省: '冀', 山西省: '晋', 内蒙古自治区: '蒙', 辽宁省: '辽',
  吉林省: '吉', 黑龙江省: '黑', 上海市: '沪', 江苏省: '苏', 浙江省: '浙', 安徽省: '皖',
  福建省: '闽', 江西省: '赣', 山东省: '鲁', 河南省: '豫', 湖北省: '鄂', 湖南省: '湘',
  广东省: '粤', 广西壮族自治区: '桂', 海南省: '琼', 重庆市: '渝', 四川省: '川', 贵州省: '黔',
  云南省: '滇', 西藏自治区: '藏', 陕西省: '陕', 甘肃省: '甘', 青海省: '青',
  宁夏回族自治区: '宁', 新疆维吾尔自治区: '新', 台湾省: '台', 香港特别行政区: '港',
  澳门特别行政区: '澳',
};

// Provincial capitals (and municipalities / SARs) are tier 1.
const CAPITALS = new Set([
  '北京', '天津', '石家庄', '太原', '呼和浩特', '沈阳', '长春', '哈尔滨', '上海', '南京',
  '杭州', '合肥', '福州', '南昌', '济南', '郑州', '武汉', '长沙', '广州', '南宁', '海口',
  '重庆', '成都', '贵阳', '昆明', '拉萨', '西安', '兰州', '西宁', '银川', '乌鲁木齐',
  '台北', '香港', '澳门',
]);

const shortAdmin = name => name
  .replace(/(壮族|回族|维吾尔|藏族|羌族|苗族|侗族|彝族|白族|傣族|景颇族|傈僳族|哈尼族|朝鲜族|蒙古族|土家族|布依族|黎族|瑶族|畲族|水族|仡佬族|满族|达斡尔族|鄂温克族|鄂伦春族|柯尔克孜族|哈萨克族|塔吉克族|锡伯族|裕固族|纳西族|拉祜族|布朗族|阿昌族|普米族|怒族|德昂族|独龙族|基诺族|门巴族|珞巴族|毛南族|仫佬族|京族|高山族|俄罗斯族|乌孜别克族|塔塔尔族|撒拉族|保安族|东乡族|土族|蒙古族|朝鲜族)+/g, '')
  .replace(/(特别行政区|自治区|自治州|地区|盟|省|市)$/g, '');

const nameEnFallback = zh => {
  const base = shortAdmin(zh).replace(/[区县旗]$/g, '');
  const py = pinyin(base, { toneType: 'none', type: 'array' }).join('');
  return py.replace(/(^|\s)\S/g, c => c.toUpperCase());
};
const MANUAL_EN = {
  北京: 'Beijing', 上海: 'Shanghai', 天津: 'Tianjin', 重庆: 'Chongqing', 广州: 'Guangzhou',
  深圳: 'Shenzhen', 成都: 'Chengdu', 杭州: 'Hangzhou', 武汉: 'Wuhan', 西安: "Xi'an",
  南京: 'Nanjing', 苏州: 'Suzhou', 香港: 'Hong Kong', 澳门: 'Macau', 台北: 'Taipei',
  乌鲁木齐: 'Urumqi', 拉萨: 'Lhasa', 呼和浩特: 'Hohhot', 哈尔滨: 'Harbin',
  厦门: 'Xiamen', 青岛: 'Qingdao', 大连: 'Dalian', 昆明: 'Kunming', 桂林: 'Guilin',
  三亚: 'Sanya', 丽江: 'Lijiang', 大理: 'Dali', 张家界: 'Zhangjiajie', 黄山: 'Huangshan',
  敦煌: 'Dunhuang', 喀什: 'Kashgar', 伊宁: 'Yining', 延吉: 'Yanji', 满洲里: 'Manzhouli',
  二连浩特: 'Erenhot', 日喀则: 'Shigatse', 林芝: 'Nyingchi', 昌都: 'Qamdo',
  西双版纳: 'Xishuangbanna', 香格里拉: 'Shangri-La', 呼伦贝尔: 'Hulunbuir',
  锡林郭勒: 'Xilingol', 阿拉善: 'Alxa', 鄂尔多斯: 'Ordos', 巴音郭楞: 'Bayingolin',
  博尔塔拉: 'Bortala', 克孜勒苏: 'Kizilsu', 阿克苏: 'Aksu', 吐鲁番: 'Turpan',
  哈密: 'Hami', 和田: 'Hotan', 阿勒泰: 'Altay', 塔城: 'Tacheng',
};

/* Download each province's city-level boundaries (cached on disk). */
fs.mkdirSync('data/province-divisions', { recursive: true });
const perProvince = {};
for (const f of provinces) {
  const code = Number(f.properties.adcode);
  const file = `data/province-divisions/${code}.json`;
  if (!fs.existsSync(file)) {
    const url = `https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`;
    process.stdout.write(`fetch ${url} ... `);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      console.log('ok');
    } catch (e) {
      console.log(`skip (${e.message})`);
      continue;
    }
  }
  try { perProvince[code] = readJson(file); } catch { /* ignore empty */ }
}

/* Simplify polygon rings with Douglas–Peucker (degrees). */
function simplifyRing(ring, tol) {
  if (ring.length < 8) return ring;
  const sq = tol * tol;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const [x1, y1] = ring[a], [x2, y2] = ring[b];
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let best = -1, bi = -1;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = ring[i];
      let d2;
      if (len2 === 0) d2 = (x - x1) ** 2 + (y - y1) ** 2;
      else {
        let t = ((x - x1) * dx + (y - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        d2 = (x - (x1 + t * dx)) ** 2 + (y - (y1 + t * dy)) ** 2;
      }
      if (d2 > best) { best = d2; bi = i; }
    }
    if (best > sq) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return ring.filter((_, i) => keep[i]);
}
function simplifyGeometry(g, tol) {
  if (!g) return null;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : null;
  if (!polys) return null;
  const out = [];
  for (const poly of polys) {
    const rings = [];
    for (const ring of poly) {
      const s = simplifyRing(ring, tol);
      if (s.length >= 4) rings.push(s);
    }
    if (rings.length) out.push(rings);
  }
  if (!out.length) return null;
  return { type: 'MultiPolygon', coordinates: out };
}

const provinceFeatures = [];
const prefectureFeatures = [];
const districtFeatures = [];
for (const p of provinces) {
  const pcode = Number(p.properties.adcode);
  const info = NAME_EN[p.properties.name] || [nameEnFallback(p.properties.name), shortAdmin(p.properties.name)];
  provinceFeatures.push({
    type: 'Feature',
    properties: { adcode: pcode, name: info[1], nameZh: p.properties.name, nameEn: info[0], level: 'province' },
    geometry: simplifyGeometry(p.geometry, 0.012),
  });
  const full = perProvince[pcode];
  if (!full || !Array.isArray(full.features)) continue;
  for (const f of full.features) {
    const pr = f.properties || {};
    if (!pr.adcode || !pr.name) continue;
    const lvl = pr.level || 'city';
    const feat = {
      type: 'Feature',
      properties: {
        adcode: Number(pr.adcode), name: shortAdmin(pr.name), nameZh: pr.name,
        province: info[1], provinceEn: info[0], level: lvl,
      },
      geometry: simplifyGeometry(f.geometry, lvl === 'district' ? 0.006 : 0.01),
    };
    if (!feat.geometry) continue;
    if (lvl === 'district') districtFeatures.push(feat); else prefectureFeatures.push(feat);
  }
}
writeJson('data/china-provinces.geojson', { type: 'FeatureCollection', features: provinceFeatures });
writeJson('data/china-prefectures.geojson', { type: 'FeatureCollection', features: prefectureFeatures });
writeJson('data/china-districts.geojson', { type: 'FeatureCollection', features: districtFeatures });

/* ------------------------------------------------------------------ */
/* 2. City points from DataV + English names / population from GeoNames */
/* ------------------------------------------------------------------ */
const cityRows = [];
for (const p of provinces) {
  const pcode = Number(p.properties.adcode);
  const info = NAME_EN[p.properties.name] || [nameEnFallback(p.properties.name), shortAdmin(p.properties.name)];
  const isMunicipality = [110000, 120000, 310000, 500000, 810000, 820000, 710000].includes(pcode);
  const full = perProvince[pcode];
  const feats = full && Array.isArray(full.features) ? full.features.filter(f => f.properties && f.properties.center) : [];
  if (isMunicipality || !feats.length) {
    const c = p.properties.center;
    let name = shortAdmin(p.properties.name);
    // Taiwan's national-level DataV feature is centred on Taipei; show the
    // capital rather than an island-sized "Taiwan" city label.
    if (pcode === 710000) name = '台北';
    cityRows.push({
      name, fullName: pcode === 710000 ? '台北市' : p.properties.name,
      en: MANUAL_EN[name] || info[0], pinyin: pinyin(name, { toneType: 'none' }).replace(/\s+/g, ''),
      province: info[1], provinceEn: info[0], level: 1, lng: c[0], lat: c[1], kind: 'city',
      adcode: pcode, aliases: [PROVINCE_ABBR[p.properties.name], name === '台北' ? '台湾' : ''].filter(Boolean),
    });
    continue;
  }
  for (const f of feats) {
    const pr = f.properties;
    const c = pr.center;
    if (!c) continue;
    if (pr.level === 'district') {
      // Districts of the four municipalities are useful at street-level zoom.
      if ([110000, 120000, 310000, 500000].includes(pcode)) {
        const name = shortAdmin(pr.name);
        cityRows.push({
          name, fullName: pr.name, en: nameEnFallback(name), pinyin: pinyin(name, { toneType: 'none' }).replace(/\s+/g, ''),
          province: info[1], provinceEn: info[0], level: 3, lng: c[0], lat: c[1], kind: 'city',
          adcode: Number(pr.adcode), aliases: [],
        });
      }
      continue;
    }
    if (pr.level !== 'city') continue;
    const name = shortAdmin(pr.name);
    const lvl = CAPITALS.has(name) ? 1 : 2;
    cityRows.push({
      name, fullName: pr.name, en: MANUAL_EN[name] || nameEnFallback(name),
      pinyin: pinyin(name, { toneType: 'none' }).replace(/\s+/g, ''),
      province: info[1], provinceEn: info[0], level: lvl, lng: c[0], lat: c[1], kind: 'city',
      adcode: Number(pr.adcode), aliases: [],
    });
  }
}

/* Districts of the four municipalities and the two SARs. Their national-level
   DataV file lists districts instead of prefecture cities, so they need a
   separate pass (otherwise 朝阳区/海淀区 etc. would never enter the index). */
for (const p of provinces) {
  const pcode = Number(p.properties.adcode);
  if (![110000, 120000, 310000, 500000, 810000, 820000].includes(pcode)) continue;
  const info = NAME_EN[p.properties.name] || [nameEnFallback(p.properties.name), shortAdmin(p.properties.name)];
  const full = perProvince[pcode];
  for (const f of (full && full.features) || []) {
    const pr = f.properties || {};
    if (pr.level !== 'district' || !pr.center || !pr.name) continue;
    const name = pr.name;
    cityRows.push({
      name, fullName: pr.name, en: nameEnFallback(name),
      pinyin: pinyin(name, { toneType: 'none' }).replace(/\s+/g, ''),
      province: info[1], provinceEn: info[0], level: 3,
      lng: pr.center[0], lat: pr.center[1], pop: 0, kind: 'district',
      adcode: Number(pr.adcode), aliases: [shortAdmin(p.properties.name)],
    });
  }
}

/* Taiwan's DataV file is unavailable, so add the main cities explicitly. */
for (const [name, en, lng, lat] of [
  ['新北', 'New Taipei', 121.4657, 25.0124], ['桃园', 'Taoyuan', 121.3010, 24.9937],
  ['台中', 'Taichung', 120.6736, 24.1477], ['台南', 'Tainan', 120.2270, 22.9999],
  ['高雄', 'Kaohsiung', 120.3014, 22.6273], ['基隆', 'Keelung', 121.7392, 25.1276],
  ['新竹', 'Hsinchu', 120.9675, 24.8138], ['嘉义', 'Chiayi', 120.4491, 23.4801],
  ['花莲', 'Hualien', 121.6015, 23.9911], ['台东', 'Taitung', 121.1500, 22.7554],
  ['宜兰', 'Yilan', 121.7530, 24.7021], ['屏东', 'Pingtung', 120.4885, 22.6761],
]) {
  cityRows.push({
    name, fullName: name + '市', en, pinyin: pinyin(name, { toneType: 'none' }).replace(/\s+/g, ''),
    province: '台湾', provinceEn: 'Taiwan', level: 2, lng, lat, pop: 0, kind: 'city', aliases: ['台湾'],
  });
}

/* County-level districts / county seats from every prefecture's DataV file. */
fs.mkdirSync('data/city-divisions', { recursive: true });
const cityParents = prefectureFeatures.map(f => ({
  adcode: f.properties.adcode,
  name: f.properties.name,
  nameZh: f.properties.nameZh,
  province: f.properties.province,
  provinceEn: f.properties.provinceEn,
}));
let divDone = 0;
async function fetchCityDivision(city) {
  const file = `data/city-divisions/${city.adcode}.json`;
  try {
    if (!fs.existsSync(file)) {
      const r = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${city.adcode}_full.json`);
      if (r.ok) fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    }
    if (!fs.existsSync(file)) return;
    const j = readJson(file);
    for (const f of j.features || []) {
      const pr = f.properties || {};
      if (!pr.center || !pr.name) continue;
      const name = pr.name.replace(/[市县]$/g, '');
      cityRows.push({
        name, fullName: pr.name, en: nameEnFallback(name),
        pinyin: pinyin(name, { toneType: 'none' }).replace(/\s+/g, ''),
        province: city.province, provinceEn: city.provinceEn, level: 3,
        lng: pr.center[0], lat: pr.center[1], pop: 0, kind: 'district',
        adcode: Number(pr.adcode), aliases: [city.name],
      });    }
  } catch { /* a missing county file must never break the build */ }
  divDone++;
  if (divDone % 40 === 0) console.log(`city divisions ${divDone}/${cityParents.length}`);
}
for (let i = 0; i < cityParents.length; i += 8) {
  await Promise.all(cityParents.slice(i, i + 8).map(fetchCityDivision));
}
console.log(`Downloaded county centres for ${divDone}/${cityParents.length} prefectures.`);


const geo = [];
const readline = (await import('node:readline')).createInterface({
  input: fs.createReadStream('data/geonames/CN.txt', { encoding: 'utf8' }),
  crlfDelay: Infinity,
});
for await (const line of readline) {
  const a = line.split('\t');
  if (a[6] !== 'P' || !['PPLC', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPL'].includes(a[7])) continue;
  const pop = Number(a[14]) || 0;
  if (pop < 20000) continue;
  const zh = (a[3] || '').split(',').find(x => /^[\u4e00-\u9fff]{2,9}$/.test(x));
  geo.push({ name: a[1], ascii: a[2], zh, lat: +a[4], lng: +a[5], pop, code: a[7] });
}
console.log(`GeoNames candidates: ${geo.length}`);

const nearestGeo = (lng, lat, maxKm = 80) => {
  let best = null, bd = Infinity;
  for (const g of geo) {
    const dx = (g.lng - lng) * 85, dy = (g.lat - lat) * 111;
    const d = Math.hypot(dx, dy);
    if (d < bd) { bd = d; best = g; }
  }
  return bd <= maxKm ? best : null;
};
for (const c of cityRows) {
  const g = nearestGeo(c.lng, c.lat);
  if (g) {
    c.pop = g.pop;
    if (c.level <= 2 && g.name && !MANUAL_EN[c.name]) c.en = g.name;
    c.aliases = [...new Set([...(c.aliases || []), g.ascii, g.name].filter(Boolean))];
  } else c.pop = 0;
}

/* Neat de-duplication (same names close together). */
const dedup = [];
for (const c of cityRows.sort((a, b) => a.level - b.level || b.pop - a.pop)) {
  if (dedup.some(x => x.name === c.name && Math.abs(x.lng - c.lng) < 0.15 && Math.abs(x.lat - c.lat) < 0.15)) continue;
  dedup.push(c);
}

/* ------------------------------------------------------------------ */
/* 3. Curated landmarks for useful domestic place search               */
/* ------------------------------------------------------------------ */
const P = (name, en, province, city, lng, lat, aliases = []) => ({
  name, en, pinyin: pinyin(name, { toneType: 'none' }).replace(/\s+/g, ''),
  province, provinceEn: NAME_EN[Object.keys(NAME_EN).find(k => k.startsWith(province + '省') || k.startsWith(province + '市') || k.startsWith(province) || false)]?.[0] || province,
  level: 3, lng, lat, kind: 'poi', category: '景点', aliases: [...aliases, city].filter(Boolean),
});
const POIS = [
  P('故宫博物院', 'The Palace Museum', '北京', '北京', 116.3970, 39.9163, ['故宫', '紫禁城', 'Forbidden City']),
  P('天安门广场', 'Tiananmen Square', '北京', '北京', 116.3975, 39.9087, ['天安门']),
  P('八达岭长城', 'Badaling Great Wall', '北京', '北京', 116.0200, 40.3560, ['长城', 'Great Wall']),
  P('颐和园', 'Summer Palace', '北京', '北京', 116.2755, 39.9999),
  P('天坛公园', 'Temple of Heaven', '北京', '北京', 116.4109, 39.8818, ['天坛']),
  P('外滩', 'The Bund', '上海', '上海', 121.4900, 31.2400),
  P('东方明珠', 'Oriental Pearl Tower', '上海', '上海', 121.4997, 31.2397, ['东方明珠塔']),
  P('上海迪士尼乐园', 'Shanghai Disney Resort', '上海', '上海', 121.6570, 31.1434, ['迪士尼']),
  P('豫园', 'Yu Garden', '上海', '上海', 121.4921, 31.2270),
  P('西湖', 'West Lake', '浙江', '杭州', 120.1480, 30.2425, ['杭州西湖']),
  P('灵隐寺', 'Lingyin Temple', '浙江', '杭州', 120.1010, 30.2410),
  P('乌镇', 'Wuzhen Water Town', '浙江', '嘉兴', 120.4900, 30.7450),
  P('普陀山', 'Mount Putuo', '浙江', '舟山', 122.3900, 30.0100),
  P('千岛湖', 'Qiandao Lake', '浙江', '杭州', 119.0410, 29.6050),
  P('中山陵', 'Sun Yat-sen Mausoleum', '江苏', '南京', 118.8480, 32.0640),
  P('夫子庙', 'Confucius Temple', '江苏', '南京', 118.7880, 32.0200, ['南京夫子庙']),
  P('苏州园林', 'Classical Gardens of Suzhou', '江苏', '苏州', 120.6290, 31.3240, ['拙政园', '留园']),
  P('周庄古镇', 'Zhouzhuang', '江苏', '苏州', 120.8450, 31.1150, ['周庄']),
  P('瘦西湖', 'Slender West Lake', '江苏', '扬州', 119.4300, 32.4200),
  P('黄山', 'Mount Huang', '安徽', '黄山', 118.1700, 30.1300, ['黄山风景区']),
  P('宏村', 'Hongcun', '安徽', '黄山', 117.9880, 30.0030),
  P('九华山', 'Mount Jiuhua', '安徽', '池州', 117.8100, 30.4800),
  P('鼓浪屿', 'Gulangyu Island', '福建', '厦门', 118.0670, 24.4470),
  P('厦门大学', 'Xiamen University', '福建', '厦门', 118.0960, 24.4360),
  P('武夷山', 'Mount Wuyi', '福建', '南平', 117.6800, 27.7300),
  P('福建土楼', 'Fujian Tulou', '福建', '龙岩', 117.0500, 24.6500, ['土楼']),
  P('滕王阁', 'Tengwang Pavilion', '江西', '南昌', 115.8810, 28.6820),
  P('庐山', 'Mount Lu', '江西', '九江', 115.9800, 29.5600),
  P('婺源', 'Wuyuan', '江西', '上饶', 117.8610, 29.2480),
  P('景德镇古窑', 'Jingdezhen Ancient Kiln', '江西', '景德镇', 117.1780, 29.2680, ['景德镇']),
  P('泰山', 'Mount Tai', '山东', '泰安', 117.1000, 36.2500),
  P('曲阜三孔', 'Temple of Confucius', '山东', '济宁', 116.9860, 35.5960, ['孔庙', '孔府', '孔林']),
  P('栈桥', 'Zhanqiao Pier', '山东', '青岛', 120.3200, 36.0600, ['青岛栈桥']),
  P('崂山', 'Mount Lao', '山东', '青岛', 120.6200, 36.1700),
  P('趵突泉', 'Baotu Spring', '山东', '济南', 117.0150, 36.6610),
  P('龙门石窟', 'Longmen Grottoes', '河南', '洛阳', 112.4780, 34.5550),
  P('少林寺', 'Shaolin Temple', '河南', '郑州', 112.9350, 34.5070),
  P('云台山', 'Yuntai Mountain', '河南', '焦作', 113.4000, 35.4300),
  P('清明上河园', 'Millennium City Park', '河南', '开封', 114.3420, 34.8120),
  P('黄鹤楼', 'Yellow Crane Tower', '湖北', '武汉', 114.3020, 30.5440),
  P('武当山', 'Mount Wudang', '湖北', '十堰', 111.0000, 32.4000),
  P('神农架', 'Shennongjia', '湖北', '神农架', 110.5000, 31.5000),
  P('三峡大坝', 'Three Gorges Dam', '湖北', '宜昌', 111.0030, 30.8230),
  P('张家界国家森林公园', 'Zhangjiajie National Forest Park', '湖南', '张家界', 110.4300, 29.3200, ['张家界', '武陵源']),
  P('凤凰古城', 'Fenghuang Ancient Town', '湖南', '湘西', 109.5990, 27.9480, ['凤凰']),
  P('橘子洲', 'Orange Isle', '湖南', '长沙', 112.9600, 28.1700),
  P('岳阳楼', 'Yueyang Tower', '湖南', '岳阳', 113.0900, 29.3700),
  P('广州塔', 'Canton Tower', '广东', '广州', 113.3240, 23.1060, ['小蛮腰']),
  P('长隆野生动物世界', 'Chimelong Safari Park', '广东', '广州', 113.3260, 22.9980, ['长隆']),
  P('世界之窗', 'Window of the World', '广东', '深圳', 113.9730, 22.5360),
  P('华侨城', 'OCT Loft', '广东', '深圳', 113.9860, 22.5390),
  P('开平碉楼', 'Kaiping Diaolou', '广东', '江门', 112.5770, 22.3700),
  P('丹霞山', 'Mount Danxia', '广东', '韶关', 113.7300, 25.0300),
  P('漓江', 'Li River', '广西', '桂林', 110.2900, 25.2700),
  P('阳朔西街', 'West Street, Yangshuo', '广西', '桂林', 110.4960, 24.7780, ['阳朔']),
  P('龙脊梯田', 'Longji Rice Terraces', '广西', '桂林', 110.1200, 25.8800),
  P('德天瀑布', 'Detian Waterfall', '广西', '崇左', 106.7500, 22.8500),
  P('涠洲岛', 'Weizhou Island', '广西', '北海', 109.1200, 21.0400),
  P('亚龙湾', 'Yalong Bay', '海南', '三亚', 109.6300, 18.2300),
  P('天涯海角', 'Tianya Haijiao', '海南', '三亚', 109.3500, 18.3000),
  P('蜈支洲岛', 'Wuzhizhou Island', '海南', '三亚', 109.7600, 18.3100),
  P('分界洲岛', 'Boundary Island', '海南', '陵水', 110.1200, 18.5700),
  P('洪崖洞', 'Hongya Cave', '重庆', '重庆', 106.5790, 29.5630),
  P('解放碑', 'Jiefangbei', '重庆', '重庆', 106.5770, 29.5580),
  P('大足石刻', 'Dazu Rock Carvings', '重庆', '重庆', 105.8000, 29.7000),
  P('武隆喀斯特', 'Wulong Karst', '重庆', '重庆', 107.7600, 29.3300),
  P('宽窄巷子', 'Kuanzhai Alley', '四川', '成都', 104.0590, 30.6630),
  P('大熊猫繁育研究基地', 'Chengdu Panda Base', '四川', '成都', 104.1470, 30.7330, ['熊猫基地', '大熊猫基地']),
  P('都江堰', 'Dujiangyan', '四川', '成都', 103.6200, 31.0000),
  P('青城山', 'Mount Qingcheng', '四川', '成都', 103.5700, 30.9000),
  P('九寨沟', 'Jiuzhaigou Valley', '四川', '阿坝', 103.9200, 33.2600),
  P('黄龙', 'Huanglong', '四川', '阿坝', 103.8200, 32.7500),
  P('峨眉山', 'Mount Emei', '四川', '乐山', 103.3300, 29.5200),
  P('乐山大佛', 'Leshan Giant Buddha', '四川', '乐山', 103.7700, 29.5450),
  P('稻城亚丁', 'Yading Nature Reserve', '四川', '甘孜', 100.3000, 28.4500, ['亚丁']),
  P('色达', 'Seda', '四川', '甘孜', 100.3300, 32.2700),
  P('梵净山', 'Mount Fanjing', '贵州', '铜仁', 108.7000, 27.9200),
  P('黄果树瀑布', 'Huangguoshu Waterfall', '贵州', '安顺', 105.6700, 25.9900),
  P('西江千户苗寨', 'Xijiang Miao Village', '贵州', '黔东南', 108.1700, 26.4900, ['千户苗寨']),
  P('荔波小七孔', 'Libo Xiaoqikong', '贵州', '黔南', 107.7000, 25.2600, ['小七孔']),
  P('洱海', 'Erhai Lake', '云南', '大理', 100.2000, 25.8000),
  P('大理古城', 'Dali Ancient Town', '云南', '大理', 100.1600, 25.6900, ['大理']),
  P('丽江古城', 'Lijiang Old Town', '云南', '丽江', 100.2340, 26.8720, ['丽江']),
  P('玉龙雪山', 'Jade Dragon Snow Mountain', '云南', '丽江', 100.1800, 27.1000),
  P('泸沽湖', 'Lugu Lake', '云南', '丽江', 100.7800, 27.7000),
  P('香格里拉', 'Shangri-La', '云南', '迪庆', 99.7000, 27.8300),
  P('梅里雪山', 'Meili Snow Mountain', '云南', '迪庆', 98.6800, 28.4400),
  P('西双版纳热带植物园', 'Xishuangbanna Tropical Botanical Garden', '云南', '西双版纳', 101.2500, 21.9200, ['西双版纳']),
  P('元阳梯田', 'Yuanyang Rice Terraces', '云南', '红河', 102.7500, 23.1100),
  P('布达拉宫', 'Potala Palace', '西藏', '拉萨', 91.1170, 29.6580),
  P('大昭寺', 'Jokhang Temple', '西藏', '拉萨', 91.1320, 29.6530),
  P('纳木错', 'Namtso', '西藏', '拉萨', 90.6000, 30.7000),
  P('羊卓雍措', 'Yamdrok Lake', '西藏', '山南', 90.7000, 28.9500),
  P('珠峰大本营', 'Everest Base Camp', '西藏', '日喀则', 86.8500, 28.1400, ['珠穆朗玛峰']),
  P('兵马俑', 'Terracotta Army', '陕西', '西安', 109.2730, 34.3850, ['秦始皇兵马俑']),
  P('大雁塔', 'Giant Wild Goose Pagoda', '陕西', '西安', 108.9640, 34.2180),
  P('西安城墙', 'Xi’an City Wall', '陕西', '西安', 108.9430, 34.2610),
  P('华山', 'Mount Hua', '陕西', '渭南', 110.0800, 34.4800),
  P('壶口瀑布', 'Hukou Waterfall', '陕西', '延安', 110.4400, 36.1500),
  P('敦煌莫高窟', 'Mogao Caves', '甘肃', '敦煌', 94.8100, 40.0400, ['莫高窟']),
  P('鸣沙山月牙泉', 'Mingsha Mountain and Crescent Lake', '甘肃', '敦煌', 94.6800, 40.0900, ['月牙泉']),
  P('嘉峪关', 'Jiayuguan Pass', '甘肃', '嘉峪关', 98.2300, 39.8000),
  P('张掖丹霞', 'Zhangye Danxia', '甘肃', '张掖', 100.1200, 38.9300),
  P('青海湖', 'Qinghai Lake', '青海', '海北', 100.2000, 36.9000),
  P('茶卡盐湖', 'Chaka Salt Lake', '青海', '海西', 99.0800, 36.7800),
  P('塔尔寺', 'Kumbum Monastery', '青海', '西宁', 101.5700, 36.4900),
  P('沙坡头', 'Shapotou', '宁夏', '中卫', 105.0000, 37.5000),
  P('西夏王陵', 'Western Xia Tombs', '宁夏', '银川', 106.0000, 38.4000),
  P('天山天池', 'Tianchi Lake', '新疆', '昌吉', 88.1200, 43.8900, ['天池']),
  P('喀纳斯', 'Kanas Lake', '新疆', '阿勒泰', 87.0300, 48.7000),
  P('禾木村', 'Hemu Village', '新疆', '阿勒泰', 87.4300, 48.5700),
  P('赛里木湖', 'Sayram Lake', '新疆', '博尔塔拉', 81.2000, 44.6000),
  P('那拉提草原', 'Nalati Grassland', '新疆', '伊犁', 84.0000, 43.3000),
  P('喀什古城', 'Kashgar Old City', '新疆', '喀什', 75.9900, 39.4700, ['喀什']),
  P('火焰山', 'Flaming Mountains', '新疆', '吐鲁番', 89.5000, 42.9500),
  P('葡萄沟', 'Grape Valley', '新疆', '吐鲁番', 89.2000, 42.9500),
  P('呼伦贝尔草原', 'Hulunbuir Grassland', '内蒙古', '呼伦贝尔', 119.7700, 49.2100, ['呼伦贝尔']),
  P('响沙湾', 'Xiangshawan', '内蒙古', '鄂尔多斯', 109.9700, 40.2300),
  P('阿尔山', 'Arxan', '内蒙古', '兴安盟', 119.9400, 47.1800),
  P('长白山', 'Changbai Mountain', '吉林', '延边', 128.0600, 42.0100, ['长白山天池']),
  P('雾凇岛', 'Rime Island', '吉林', '吉林', 126.6500, 44.1500),
  P('净月潭', 'Jingyuetan', '吉林', '长春', 125.4500, 43.7800),
  P('哈尔滨冰雪大世界', 'Harbin Ice and Snow World', '黑龙江', '哈尔滨', 126.5800, 45.7700, ['冰雪大世界']),
  P('中央大街', 'Central Street', '黑龙江', '哈尔滨', 126.6200, 45.7700),
  P('圣索菲亚教堂', 'Saint Sophia Cathedral', '黑龙江', '哈尔滨', 126.6200, 45.7680),
  P('五大连池', 'Wudalianchi', '黑龙江', '黑河', 126.1200, 48.7200),
  P('漠河北极村', 'Arctic Village', '黑龙江', '大兴安岭', 122.3600, 53.4700, ['北极村']),
  P('沈阳故宫', 'Shenyang Imperial Palace', '辽宁', '沈阳', 123.4560, 41.7960),
  P('大连星海广场', 'Xinghai Square', '辽宁', '大连', 121.5900, 38.8800, ['星海广场']),
  P('老虎滩海洋公园', 'Laohutan Ocean Park', '辽宁', '大连', 121.6800, 38.8700),
  P('金石滩', 'Jinshitan', '辽宁', '大连', 122.0000, 39.0800),
  P('避暑山庄', 'Chengde Mountain Resort', '河北', '承德', 117.9400, 40.9900, ['承德避暑山庄']),
  P('山海关', 'Shanhaiguan', '河北', '秦皇岛', 119.7500, 40.0100),
  P('北戴河', 'Beidaihe', '河北', '秦皇岛', 119.4800, 39.8300),
  P('平遥古城', 'Pingyao Ancient City', '山西', '晋中', 112.1750, 37.2000, ['平遥']),
  P('云冈石窟', 'Yungang Grottoes', '山西', '大同', 113.1200, 40.1100),
  P('五台山', 'Mount Wutai', '山西', '忻州', 113.5900, 39.0100),
];
writeJson('data/china-cities.json', { generatedAt: new Date().toISOString(), cities: dedup, pois: POIS });

console.log(`cities: ${dedup.length} (tier1 ${dedup.filter(c => c.level === 1).length}, tier2 ${dedup.filter(c => c.level === 2).length}, districts ${dedup.filter(c => c.level === 3).length}), POIs: ${POIS.length}`);
