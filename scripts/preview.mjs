// Renders the real page (src/render.ts) for one host and language with the
// scene inlined, as a single HTML file you can open without the Worker.
//   node scripts/preview.mjs [host] [accept-language]   -> dist/preview.html
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const config = JSON.parse(readFileSync("dist/config.json", "utf8"));
const host = process.argv[2] || config.sites[0].hosts[0].replace(/^\*\./, "");
const lang = process.argv[3] || config.defaultLanguage;

const r = await build({ entryPoints: ["src/render.ts"], bundle: true, format: "esm", platform: "node", write: false, loader: { ".html": "text" }, logLevel: "warning" });
const { renderPage } = await import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString("base64")}`);

// a window that ends 5h42m from now, so the countdown has something to show
const until = new Date(Date.now() + (5 * 60 + 42) * 60e3).toISOString();
const scene = readFileSync("dist/scene.bundle.txt", "utf8").replace(/<\/script/gi, "<\\/script");
const html = renderPage({ config, host, acceptLanguage: lang, until, sceneSrc: "__SCENE__" })
  .replace(/<meta http-equiv="refresh"[^>]*>\n/, "")
  .replace('<script type="module" src="__SCENE__"></script>', () => `<script type="module">${scene}</script>`);
writeFileSync("dist/preview.html", html);
console.log(`dist/preview.html (${host}, ${lang}) ${(html.length / 1024).toFixed(0)} KiB`);
