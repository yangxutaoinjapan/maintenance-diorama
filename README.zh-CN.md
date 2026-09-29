# maintenance-diorama

[English](README.md) · [日本語](README.ja.md) · **简体中文**

一个由 Cloudflare Worker 提供的电影感维护页。页面主体是一座卡通渲染的 three.js
微缩模型：雨夜里日本街角的施工现场。四周像电影画面一样叠加品牌名、实时时钟、
预计恢复时间与倒计时，以及支撑你平台的服务图标。

![四季轮转的微缩模型](docs/seasons.gif)

![完整页面](docs/screenshot.png)

- **从边缘提供，一个变量切换。** Worker 常驻在路由上：`MAINTENANCE=on` 时配置里的
  所有域名都显示维护页（HTTP 503 并带 `Retry-After`），否则请求原样转发到源站。
  在 Cloudflare 面板上几秒即可切换。源站、网关或隧道宕机时页面照常显示。
- **一个配置文件。** 域名、品牌、语言、结束时间、时区和服务图标都写在
  `maintenance.config.json` 里。
- **多语言。** 内置日语、英语、简体中文、繁体中文、韩语、西班牙语、法语、德语；
  按 `Accept-Language` 自动选择，页面内可切换（`?lang=`），也可在配置里自行添加。
- **有动感但不喧闹。** 雨、涟漪、水洼倒影、吊装管片的起重机、红绿灯、闪烁的
  灯牌，以及四季轮转（樱花、夏雨、红叶、雪）。拖动旋转，滚轮缩放。
- **可降级。** 文字是真正的 HTML，没有 WebGL 或 JavaScript 也能阅读；遵循
  `prefers-reduced-motion`；JSON 客户端和非 GET 请求收到 JSON 格式的 503。

## 快速开始

需要 Node.js 22+，以及托管目标域名的 Cloudflare 账号。

```bash
npm ci
cp maintenance.config.example.json maintenance.config.json   # 然后编辑
npm run build && npm run preview    # 用浏览器打开 dist/preview.html
npx wrangler login
npm run off                         # 安装 Worker，流量原样放行
npm run on                          # 所有配置的路由进入维护
npm run off                         # 结束维护
```

## 开启和结束维护

开关是 Worker 变量 `MAINTENANCE`：`on` 显示维护页，其他值（包括未设置）一律原样
放行。

- **面板：** Workers & Pages → 你的 Worker → Settings → Variables and Secrets →
  把 `MAINTENANCE` 设为 `on` 或 `off` → Deploy。几秒内生效，不需要终端。
- **命令行：** `npm run on` / `npm run off`。

生成的 `wrangler.toml` 带有 `keep_vars = true`，所以改完配置后执行
`npm run deploy` 也会保留面板上的开关状态。`npm run remove` 会删除 Worker 及其路由。

Worker 常驻在路由上，所以即使维护关闭，发往这些域名的每个请求也都会经过它，占用
Workers 的请求额度（免费版每天 10 万次）。放行时的 CPU 耗时不到 1 毫秒。如果接近
额度，在面板上把路由的失败模式设为 *fail open*，超额的请求就会直接到达源站。

`maintenance.config.json` 不纳入 Git。想放在别处，用 `MAINTENANCE_CONFIG` 指定：

```bash
MAINTENANCE_CONFIG=../ops/maintenance.config.json npm run on
```

`wrangler.toml` 由 `npm run build` 根据配置生成，请修改配置而不是生成的文件。

## 配置项

| 键 | 含义 |
|---|---|
| `worker.name` | Worker 脚本名 |
| `routes` | `[{ pattern, zone }]`，开关覆盖的 Worker 路由 |
| `passHosts` | 不显示维护页、直接放行的域名（例如受访问控制保护的管理后台） |
| `until` | 预计结束时间（ISO 8601，UTC），用于倒计时和 `Retry-After` |
| `timeZone` | `{ id, label }`，例如 `{ "id": "Asia/Tokyo", "label": "JST" }` |
| `defaultLanguage` | 访客语言不在配置中时使用的语言 |
| `sites` | `[{ hosts, brand }]`，每个域名显示的品牌（支持 `*.example.com`） |
| `copy` | 每种语言的文案：`label`、`title`、`status`、`eyebrow`、`headline`（`\n` 换行）、`body`、`etaLabel`（`{tz}`）、`soon`、`left`、`services`、`hint` |
| `notice` | 模型中告示牌的文字，`{brand}` 和 `{end}` 会被替换；`address` 是电线杆上的地址牌 |
| `services` | `[{ icon, name }]`，`icon` 是 [Simple Icons](https://simpleicons.org) 的 slug |

添加语言：在 `copy` 里以 BCP 47 标签（如 `pt-BR`、`it`）为键新增一项即可。日期对
ja、zh、ko、en 使用内置格式，其他语言使用 `Intl.DateTimeFormat`。

模型里的告示牌是日本街景的一部分，默认保持日文；修改 `notice` 即可换成你自己的内容。

预计结束时间也可以通过 Worker 变量 `MAINTENANCE_UNTIL` 覆盖。

## 预览

`npm run preview -- <域名> <语言>` 按指定域名和语言渲染。在预览或线上页面加
`?season=spring|summer|autumn|winter` 指定季节，加 `?still=1` 停止自动旋转。

## 致谢

- [three.js](https://threejs.org)（MIT）
- 品牌图标来自 [Simple Icons](https://simpleicons.org)（CC0）。各标志为其所有者的
  商标，请只展示你实际使用的服务。

## 许可证

MIT
