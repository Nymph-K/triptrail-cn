# TripTrail CN

<p align="center">
  <b>中文</b> · <a href="#english">English</a>
</p>

<p align="center">
  Turn a trip into a cinematic animated map video, right in the browser.<br/>
  A Chinese-first fork of <a href="https://github.com/Fangyuan025/triptrail">Fangyuan025/triptrail</a>.
</p>

<p align="center">
  <a href="https://github.com/Nymph-K/triptrail-cn"><b>本项目仓库 · Nymph-K/triptrail-cn</b></a><br/>
  <a href="https://github.com/Fangyuan025/triptrail"><b>原项目 · Fangyuan025/triptrail</b></a>
</p>

![TripTrail 中文界面](assets/preview-cn.png)

> 这是一个独立增强版，不是原项目的官方分支。原项目版权归 Fangyuan Lin 所有；本仓库代码继续使用与原项目相同的 MIT 协议。

---

## 中文

### 项目简介

TripTrail 是一个纯前端的旅行地图动画工作室：搜索/选择途经点，配置路线、照片、视频和交通工具图标，然后预览或导出带镜头运动的旅行地图视频。

本仓库在 [Fangyuan025/triptrail](https://github.com/Fangyuan025/triptrail) 基础上做了大量中文本地化与中国地图增强，并加入了自定义地点、多媒体轮播和交通工具图标等功能。

### 本版修改/新增功能

- **中文优先界面 + 中英文切换**：默认中文，右上角 `EN / 中` 一键切换。标题、按钮、提示、路线字幕、途经点、城市标注、图标设置都会跟随语言。
- **中国模式**：默认锁定中国范围，使用高德中文底图、中国省/市/区县边界、本地城市库和分级城市标注；也可以切回全球模式。
- **9 种地图样式**：高德中文路网、高德卫星、Esri 卫星、Voyager、Eclipse、Dark Matter、Liberty、Fiord、Positron。
- **离线中国地点库**：3,200 个城市/区县 + 522 个景点，支持中文、拼音、英文搜索，如 `杭州`、`hangzhou`、`西湖`、`故宫`、`鹿回头`。城市搜索在断网时仍可用。
- **城市分级显示**：省会/直辖市 → 地级市 → 区县随缩放逐级出现，支持“自动分级 / 仅省会 / 省会+地级市 / 全部”四档。
- **途经点始终置顶**：城市标注之下的所有途经点始终显示，并在导出的视频中保留。
- **自定义地点完整增删改查**：输入名称、经纬度落点；列表支持编辑、删除、搜索；修改地点时关联途经点同步更新。
- **自定义地点 JSON**：以 UTF-8 明文保存/加载 `.json`，支持合并或覆盖，兼容 `places` 对象、纯数组和 UTF-8 BOM。
- **项目配置文件**：保存/载入 `.triptrail.json`，包含标题、途经点、交通方式、图标、地图设置、媒体间隔、媒体比例和常用地点。
- **停靠点多媒体系列**：每个途经点支持多张图片、GIF、视频、Live Photo 混排；卡片叠放，播放完成后开始切换。
- **动态媒体完整播放**：GIF/视频/Live 时长超过设定间隔时，自动延长当前卡片直到播放完成；静态图片仍按间隔。
- **媒体比例**：支持“每张原始比例”或统一 3:2 / 4:3 / 16:9 / 1:1 / 3:4。
- **GIF/视频修复**：GIF 用 `ImageDecoder` 逐帧解码；视频与 Live 绘制到动画画布。含视频的行程自动使用实时录制保证同步。
- **每段交通工具图标**：支持透明 PNG、SVG、JPG、ICO、GIF（循环）和 Emoji；可设置大小（16–140 px）、原始朝向、东西向自动翻转和路线切线旋转。
- **本地核心依赖**：MapLibre GL 与 MP4 muxer 放入 `vendor/`；零依赖 Node 静态服务器。

### 快速开始

需要 Node.js 18+，无需安装 npm 依赖：

```bash
git clone https://github.com/Nymph-K/triptrail-cn.git
cd triptrail-cn
npm start
```

打开 **http://127.0.0.1:8742**。

如果端口被占用：

```powershell
$env:PORT=8743; npm start
```

不要用 `file://` 直接打开页面；地图和 JSON 数据需要 HTTP 服务。

### 使用流程

1. 在“地图区域”选择 **中国模式** 或 **全球模式**。
2. 搜索城市、区县、景点，或点击地图落点；展开“自定义地点（增删改查）”可管理常用地点。
3. 点击途经点右侧相机按钮添加图片/GIF/视频；同名 JPG/PNG + MOV/MP4 自动配成 Live Photo。
4. 在交通方式下方设置该段的交通工具图标、大小、朝向、自动翻转/切线旋转。
5. 在“路线生成”输入整段行程，或导入 GPX/KML/GeoJSON。
6. 在“外观”调整地图、比例、主题色、节奏、媒体停留和媒体比例。
7. 点“预览”检查，点“录制视频”导出 MP4/WebM。

> 录制 MP4 使用浏览器 WebCodecs，建议最新版 Chrome / Edge，并在录制时保持页面可见。
>
> 含视频/Live 的行程会自动改用实时录制；纯图片/GIF 走逐帧离线渲染。

### 交通工具图标说明

- **原始朝向**：朝右 / 朝左 / 朝上，用于描述素材本身的车头方向。
- **东西向自动翻转**：关闭旋转时生效；整体东行朝右、西行朝左，南北向不强行翻转。
- **随路线切线旋转**：开启后，侧视图标会先镜像保持正向，再按切线相对水平轴旋转（±90° 内，不会上下颠倒）；朝上图标准按切线全角度旋转。

### 自定义地点 JSON

“保存地点 JSON”生成可直接编辑的 UTF-8 纯文本文件：

```json
{
  "schema": "triptrail.customPlaces",
  "version": 1,
  "places": [
    { "name": "我的观景台", "lng": 116.397, "lat": 39.908 },
    { "name": "西湖秘境", "lng": 120.148, "lat": 30.242 }
  ]
}
```

也支持直接加载数组 `[{ "name": "...", "lng": ..., "lat": ... }]`。默认合并；勾选“加载时覆盖现有列表”则替换。

### 路线真实性

- **汽车、大巴、房车、摩托、自行车、步行**：使用 OSRM 真实道路网络。
- **火车/高铁**：当前沿地面走廊生成，**不是铁路轨道**；公开可用的铁路路由服务不稳定，因此未强行实现铁路专用线路，UI 标记为“地面走廊”。
- **飞机**：大圆航线；**轮船**：内置 SeaRoute 海运网络。

### 地图与数据

| 内容 | 来源 |
|---|---|
| 中国省/市/区县边界 | [阿里云 DataV 行政区划](https://datav.aliyun.com/portal/school/atlas/area_selector)（本地简化文件） |
| 中国城市/区县坐标 | DataV + [GeoNames](https://www.geonames.org/)（CC BY 4.0） |
| 精选景点（137 条） | 本项目整理 |
| 城市 Top10 景点（385 条，40 个城市） | [james0618-yang/travel-top10](https://github.com/james0618-yang/travel-top10)，高德 POI 衍生数据，已转 GCJ-02 |
| 高德中文路网/卫星 | 高德地图公开栅格瓦片（版权归高德） |
| Esri 卫星 | Esri World Imagery |
| 全球矢量底图 | CARTO / OpenFreeMap / VersaTiles |
| 在线地理编码 | Nominatim（OpenStreetMap） |
| 公路道路 | OSRM demo / routing.openstreetmap.de |
| 海运网络 | Eurostat SeaRoute |

底图瓦片、Nominatim、OSRM 需要联网；本地城市搜索、中国边界和路线预览不依赖这些在线服务。

### 坐标与使用条款

DataV 与高德瓦片使用 GCJ-02 坐标体系，本项目中国城市/边界按此体系使用，在高德底图上对齐最好；切换到 Esri/WGS-84 卫星影像时可能有数百米偏移。

高德、Esri、CARTO、OpenFreeMap 等瓦片和 POI 数据有各自的服务条款。本项目仅用于个人学习与演示；商用或公开部署前请确认授权要求。

### 目录结构

```text
index.html                  界面
i18n.js                     中英文文案
app.js                      地图、路线、搜索、多媒体、动画、导出
style.css                   界面样式
server.mjs                  零依赖本地静态服务器
data/china-cities.json      3,200 个城市/区县 + 137 个精选景点
data/china-pois-extra.json  40 个城市的 Top10 景点（385 条）
data/china-provinces.geojson
data/china-prefectures.geojson
data/china-districts.geojson
vendor/maplibre/            本地 MapLibre GL
vendor/mp4-muxer.mjs        本地 MP4 muxer
scripts/                    数据构建脚本
```

### 数据重建

```bash
npm install --prefix scripts
node scripts/fetch-assets.mjs
node scripts/build-china-data.mjs
node scripts/build-extra-pois.mjs
```

---

## English

### Overview

TripTrail is a browser-only travel map animation studio. Pick stops, configure routes, photos, videos and vehicle icons, then preview or export a cinematic travel map video.

This repository is an independent, Chinese-first fork of [Fangyuan025/triptrail](https://github.com/Fangyuan025/triptrail). It keeps the original MIT license and adds China-specific maps, localization and richer stop media.

### What changed

- **Chinese-first UI with EN/中 toggle**: the full interface, captions, stop labels and icon settings switch language instantly.
- **China mode**: China bounds, AMap Chinese basemaps, local province/prefecture/district borders, offline city index and tiered city labels.
- **9 basemaps**: AMap road, AMap satellite, Esri satellite, Voyager, Eclipse, Dark Matter, Liberty, Fiord and Positron.
- **Offline China place index**: 3,200 cities/districts and 522 attractions with Chinese, pinyin and English search.
- **Tiered city labels**: capitals → prefectures → districts, with four display levels; waypoints always stay above city labels.
- **Custom places CRUD**: add, list, edit, delete and search custom name/lng/lat places; linked stops update with the place.
- **Plaintext custom-place JSON**: UTF-8 export/import, merge or replace, object/array formats and BOM support.
- **Project config**: save/load titles, stops, transport, icons, map settings, media timing/aspect and custom places in `.triptrail.json` (media binaries are not embedded).
- **Rich stop media**: multiple images, GIFs, videos and Live Photos per stop, stacked as cards and played in sequence.
- **Correct dynamic timing**: GIF/video/Live cards extend automatically until playback finishes; static images use the configured interval; the last card never wraps to the first.
- **Configurable media aspect**: original per-item aspect, or uniform 3:2 / 4:3 / 16:9 / 1:1 / 3:4.
- **Per-leg vehicle icons**: transparent PNG, SVG, JPG, ICO, looping GIF or Emoji; size 16–140 px; art facing, east/west auto-flip and optional tangent rotation. Side-view art is mirrored upright, not rotated 180°.
- **Local vendor assets**: MapLibre GL and MP4 muxer are bundled; the static server has no npm runtime dependencies.

### Quick start

Requires Node.js 18+.

```bash
git clone https://github.com/Nymph-K/triptrail-cn.git
cd triptrail-cn
npm start
```

Open **http://127.0.0.1:8742**.

Use a normal HTTP server; do not open `index.html` via `file://`.

### Notes and limitations

- Car/bus/bike/walk routes use real OSRM roads. Trains follow ground corridors, **not actual railway tracks**; a stable public rail router was not available.
- Planes use great-circle routes; boats use the bundled SeaRoute marine network.
- AMap/Esri tiles, Nominatim and OSRM require network access and are subject to their own terms.
- The China data uses GCJ-02; WGS-84 satellite basemaps may show a small offset.
- MP4 export uses WebCodecs. Trips containing video/Live media fall back to realtime recording for correct motion sync.
- Live Photo pairing: same-name JPG/PNG + MOV/MP4; HEIC + MOV works via the video stream, while HEIC-only still images are not decodable in most browsers.
- AMap POI-derived attraction data and map tiles are for personal/demo use; check the providers' terms before commercial deployment.

### Original project and license

Original project: [https://github.com/Fangyuan025/triptrail](https://github.com/Fangyuan025/triptrail)

Original author: Fangyuan Lin

This fork is released under the **same MIT License** as the original project. See [LICENSE](LICENSE). Original copyright and license notices are preserved. Map tiles, POI data and other third-party assets remain the property of their respective providers.

---

## License / 许可证

MIT — same as the original [Fangyuan025/triptrail](https://github.com/Fangyuan025/triptrail).

Original copyright © Fangyuan Lin. Modifications © their respective contributors.

MIT 协议，与原项目一致。原项目版权归 Fangyuan Lin 所有；第三方地图与 POI 数据版权归各自提供方所有。
