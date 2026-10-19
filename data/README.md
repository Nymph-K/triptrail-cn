# 中国地图数据

这些文件是运行时直接加载的本地数据，不含在线请求。

| 文件 | 说明 |
|---|---|
| `china-provinces.geojson` | 34 个省级行政区边界（简化） |
| `china-prefectures.geojson` | 地级行政区边界（简化） |
| `china-districts.geojson` | 直辖市与特别行政区辖区边界（简化） |
| `china-cities.json` | 3,200 个城市/区县点位与 137 个精选景点，用于离线搜索和分级标注 |
| `china-pois-extra.json` | 40 个城市的 Top10 景点（385 条，含地址、类型、拼音），已转换为 GCJ-02 |

## 生成方式

```bash
node scripts/fetch-assets.mjs
npm install --prefix scripts
node scripts/build-china-data.mjs
node scripts/build-extra-pois.mjs
```

`fetch-assets.mjs` 会下载：

- 阿里云 DataV 中国行政区划 GeoJSON；
- GeoNames `CN.zip`（用于英文名、人口和地名补全）；
- MapLibre GL 与许可证；
- MP4 muxer。

`build-extra-pois.mjs` 还会从 GitHub 拉取 `james0618-yang/travel-top10` 的 40 个城市景点数据。

原始下载文件体积较大，不纳入运行时目录。

## 字段

城市/区县：

```json
{
  "name": "杭州",
  "fullName": "杭州市",
  "en": "Hangzhou",
  "pinyin": "hangzhou",
  "province": "浙江",
  "provinceEn": "Zhejiang",
  "level": 1,
  "lng": 120.153576,
  "lat": 30.287459,
  "kind": "city",
  "pop": 11936010,
  "aliases": ["Hangzhou"]
}
```

- `level`: 1 = 省会/直辖市/特别行政区；2 = 地级市；3 = 区县。
- `kind`: `city`、`district`、`poi`、`custom`（自定义地点只在浏览器本机生成）。
- 景点位于顶层 `pois` 数组，`kind` 为 `poi`；`china-pois-extra.json` 额外提供地址和原始类型。

## 版权与坐标

- 行政区划：阿里云 DataV（版权归原提供方）。
- 英文名与人口：GeoNames，CC BY 4.0。
- 城市 Top10 景点：[james0618-yang/travel-top10](https://github.com/james0618-yang/travel-top10)，数据来自高德 POI，已从 WGS-84 转换为 GCJ-02；使用时请遵守高德数据条款。
- 精选景点坐标为项目整理，仅用于搜索定位。
- 数据为 GCJ-02 坐标体系，与高德瓦片对齐；在 Esri/WGS-84 底图上可能有偏移。
- 使用高德/Esri 等瓦片前请确认其服务条款。
