// The page around the diorama: the service strip, the local clock and the
// countdown to the expected end. The text itself is server-rendered in the
// visitor's language (src/page.html); this module only animates it.
const DATA = window.MAINTENANCE || {};
// [{ name, hex, path }] resolved from Simple Icons at configure time
const SERVICES = DATA.services || [];

const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// no WebGL: the page stays a plain notice
try { const c = document.createElement("canvas"); if (!(c.getContext("webgl2") || c.getContext("webgl"))) root.classList.add("no-webgl"); }
catch { root.classList.add("no-webgl"); }

const list = document.getElementById("svc");
if (list) {
  const items = SERVICES.map(({ name, hex, path }, i) => {
    const li = document.createElement("li");
    li.style.setProperty("--brand", `#${hex}`);
    li.style.setProperty("--i", String(i));
    li.title = name;
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), p = document.createElementNS(ns, "path");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", name);
    p.setAttribute("d", path); svg.appendChild(p); li.appendChild(svg);
    list.appendChild(li);
    return li;
  });
  // one service "under inspection" at a time, in the configured order
  const now = document.getElementById("svc-now");
  if (!reduced) {
    let k = 0;
    const step = () => { items.forEach((el, i) => el.classList.toggle("on", i === k)); if (now) now.textContent = SERVICES[k].name; k = (k + 1) % items.length; };
    if (items.length) { step(); setInterval(step, 1600); }
  }
}

const clock = document.getElementById("clock");
const left = document.getElementById("left");
const until = Date.parse(root.dataset.until || "");
const p2 = (n) => String(n).padStart(2, "0");
let clockFmt;
try { clockFmt = new Intl.DateTimeFormat("en-GB", { timeZone: DATA.timeZone || undefined, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }); }
catch { clockFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }); }
function tick() {
  if (clock) clock.textContent = clockFmt.format(new Date());
  if (left && !isNaN(until)) {
    const s = Math.max(0, Math.round((until - Date.now()) / 1000));
    left.textContent = s ? `${Math.floor(s / 3600)}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}` : "—";
  }
}
tick(); setInterval(tick, 1000);

// film grain: one small noise tile, jittered by CSS
{
  const c = document.createElement("canvas"); c.width = c.height = 160;
  const g = c.getContext("2d"), img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 22; }
  g.putImageData(img, 0, 0);
  root.style.setProperty("--grain", `url(${c.toDataURL()})`);
}

requestAnimationFrame(() => root.classList.add("ready"));
