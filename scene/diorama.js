// A rainy-night Japanese street-corner construction site as a small
// collectible diorama: toon shading with outlines, a warm site office against
// a cold wet street, and quiet motion (rain, drips, ripples, flickering
// notice board, sequential arrow board, rotating beacons, the office door,
// streaks on the glass, a crane lowering a segment, traffic lights).
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import "./overlay.js";

const canvas = document.getElementById("c");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = Math.min(innerWidth, innerHeight) < 700;
// Text for the notice board; the page provides it (window.MAINTENANCE.notice).
const NOTICE = Object.assign({
  title: "工事のお知らせ",
  subject: "Example Cloud 基盤更新工事",
  lines: ["ただいまシステムの保守作業を", "行っております。", "ご迷惑をおかけしますが、", "ご理解とご協力を", "お願いいたします。"],
  eta: "",
  owner: "発注者　Example Cloud",
  plate: "Example Cloud",
  site: "Example Cloud 作業所",
  address: "本町 3-2",
}, (window.MAINTENANCE || {}).notice || {});

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a2238, 40, 100);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
camera.position.set(7.1, 23, 34.5);

{ // sky
  const c = document.createElement("canvas"); c.width = 4; c.height = 512;
  const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#0a0f1e"); gr.addColorStop(0.5, "#17203a"); gr.addColorStop(0.78, "#2a3354"); gr.addColorStop(1, "#3a3a5a");
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}

// ---------- toon materials & helpers ----------
const gradientMap = (() => {
  const d = new Uint8Array([118, 118, 118, 255, 185, 185, 185, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap, ...o });
const noOutline = (m) => { m.userData.outlineParameters = { visible: false }; return m; };
const glow = (color, o = {}) => noOutline(new THREE.MeshBasicMaterial({ color, toneMapped: false, ...o }));
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function add(mesh, parent, x = 0, y = 0, z = 0) { mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; (parent || scene).add(mesh); return mesh; }
const box = (w, h, d, m, x, y, z, p, r = 0) => add(new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2 - 0.001)) : new THREE.BoxGeometry(w, h, d), m), p, x, y, z);
const cyl = (rt, rb, h, m, p, seg = 20) => add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m), p);
function canvasTex(w, h, paint) { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const JP = "'Hiragino Sans','Noto Sans JP','Yu Gothic',sans-serif";
const YELLOW = toon(0xf2b01e), YELLOW_D = toon(0xd08e10), STEEL = toon(0x8a93a0), DARK = toon(0x2e333d), WHITE = toon(0xf2eee6), RUBBER = toon(0x1a1b1f), ORANGE = toon(0xff7a1a);
const FASTENER = toon(0xb7bec5), EDGE = toon(0x515965);

// ---------- the base: a plinth with soil strata on its sides ----------
const S = 20, PL = 3.2; // plinth depth below the surface
{
  const strataTex = canvasTex(64, 512, (g, w, h) => {
    const bands = [["#5b6070", 0.04], ["#8a6a47", 0.26], ["#735537", 0.24], ["#5d432c", 0.26], ["#4a3423", 0.2]];
    let y = 0; for (const [c, f] of bands) { g.fillStyle = c; g.fillRect(0, y, w, f * h + 1); y += f * h; }
    const r = rnd(4); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(20,12,6,${0.2 + r() * 0.3})`; g.beginPath(); g.arc(r() * w, 20 + r() * (h - 20), 0.6 + r() * 2.2, 0, 7); g.fill(); }
  });
  strataTex.wrapS = THREE.RepeatWrapping; strataTex.repeat.set(6, 1);
  const side = toon(0xffffff, { map: strataTex });
  const top = toon(0x2b2420);
  const mats = [side, side, top, top, side, side];
  // plinth built around the shaft footprint so the pit really goes down
  const SX0 = -1.6, SX1 = 1.6, SZ0 = -4.2, SZ1 = -1.0, SD = 2.6;
  const pieces = [[-10, SX0, -10, 10], [SX1, 10, -10, 10], [SX0, SX1, -10, SZ0], [SX0, SX1, SZ1, 10]];
  for (const [x0, x1, z0, z1] of pieces) add(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, PL, z1 - z0), mats), null, (x0 + x1) / 2, -PL / 2 - 0.001, (z0 + z1) / 2);
  add(new THREE.Mesh(new THREE.BoxGeometry(SX1 - SX0, PL - SD, SZ1 - SZ0), mats), null, 0, -SD - (PL - SD) / 2, (SZ0 + SZ1) / 2);
  // shaft lining (inner walls), with ladder, a warm glow from the tunnel eye
  const wallM = toon(0x8d949b), eye = new THREE.Group(); scene.add(eye);
  box(SX1 - SX0, SD, 0.1, wallM, 0, -SD / 2, SZ0 + 0.05); box(SX1 - SX0, SD, 0.1, wallM, 0, -SD / 2, SZ1 - 0.05);
  box(0.1, SD, SZ1 - SZ0, wallM, SX0 + 0.05, -SD / 2, (SZ0 + SZ1) / 2); box(0.1, SD, SZ1 - SZ0, wallM, SX1 - 0.05, -SD / 2, (SZ0 + SZ1) / 2);
  for (let y = -SD + 0.2; y < 0; y += 0.45) box(1.6, 0.04, 0.04, toon(0x5f6872), 0, y, SZ0 + 0.14);
  for (const x of [-1.1, -0.7]) box(0.04, SD, 0.04, YELLOW, x, -SD / 2, SZ1 - 0.14);
  for (let y = -SD + 0.2; y < 0; y += 0.3) box(0.44, 0.03, 0.03, YELLOW, -0.9, y, SZ1 - 0.14);
  const tunnelEye = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), glow(0xffc27a)); tunnelEye.position.set(SX1 - 0.11, -SD + 1.0, (SZ0 + SZ1) / 2); tunnelEye.rotation.y = -Math.PI / 2; scene.add(tunnelEye);
  box(1.0, 0.2, 2.8, toon(0x2a2e36), 0.2, -SD + 0.1, (SZ0 + SZ1) / 2);
  const pitLight = new THREE.PointLight(0xffb866, 14, 7, 1.4); pitLight.position.set(0, -1.2, (SZ0 + SZ1) / 2); scene.add(pitLight);
  // guard rails around the pit (yellow / black)
  const railTex = canvasTex(64, 8, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#1a1a1a" : "#f2c21e"; g.fillRect(i * 8, 0, 8, h); } });
  railTex.wrapS = THREE.RepeatWrapping; railTex.repeat.set(3, 1);
  const railM = toon(0xffffff, { map: railTex });
  for (const [w, d, x, z] of [[SX1 - SX0 + 0.3, 0.06, 0, SZ0 - 0.15], [SX1 - SX0 + 0.3, 0.06, 0, SZ1 + 0.15], [0.06, SZ1 - SZ0 + 0.3, SX0 - 0.15, (SZ0 + SZ1) / 2], [0.06, SZ1 - SZ0 + 0.3, SX1 + 0.15, (SZ0 + SZ1) / 2]]) {
    for (const y of [0.55, 0.95]) box(w, 0.06, d, railM, x, 0.12 + y, z);
  }
  for (const [x, z] of [[SX0 - 0.15, SZ0 - 0.15], [SX1 + 0.15, SZ0 - 0.15], [SX0 - 0.15, SZ1 + 0.15], [SX1 + 0.15, SZ1 + 0.15], [0, SZ0 - 0.15], [0, SZ1 + 0.15]]) box(0.06, 1.0, 0.06, YELLOW, x, 0.6, z);
}
box(S + 0.5, 0.2, S + 0.5, toon(0x1b1714), 0, -PL - 0.1, 0);
{ // name plate
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.5), glow(0xffffff, { map: canvasTex(512, 76, (g, w, h) => { g.fillStyle = "#b08a4a"; g.fillRect(0, 0, w, h); g.fillStyle = "#2a1d0e"; g.font = "600 40px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(NOTICE.plate, w / 2, h / 2 + 2); }) }));
  plate.position.set(0, -PL + 0.4, S / 2 + 0.01); scene.add(plate);
}

// ---------- streets ----------
const asphaltTex = canvasTex(512, 512, (g, w) => {
  const r = rnd(31); g.fillStyle = "#2a2d34"; g.fillRect(0, 0, w, w);
  for (let i = 0; i < 9000; i++) { const v = 30 + r() * 40; g.fillStyle = `rgba(${v},${v + 2},${v + 8},.5)`; g.fillRect(r() * w, r() * w, 1.5, 1.5); }
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(10,12,16,.35)"; g.beginPath(); g.ellipse(r() * w, r() * w, 20 + r() * 40, 10 + r() * 20, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(8,9,12,.7)"; g.lineWidth = 1.2;
  for (let i = 0; i < 10; i++) { let x = r() * w, y = r() * w; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  g.strokeStyle = "rgba(15,16,20,.35)"; g.lineWidth = 10; for (const y of [0.3, 0.42, 0.7, 0.82]) { g.beginPath(); g.moveTo(0, y * w); g.lineTo(w, y * w + (r() - 0.5) * 10); g.stroke(); }
});
asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping; asphaltTex.repeat.set(4, 1);
const asphalt = new THREE.MeshStandardMaterial({ color: 0x9aa0ad, map: asphaltTex, roughness: 0.28, metalness: 0.0 });
const tileTex = canvasTex(256, 256, (g, w) => { const r = rnd(17); g.fillStyle = "#7c808a"; g.fillRect(0, 0, w, w); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 108 + r() * 26; g.fillStyle = `rgb(${v},${v + 2},${v + 8})`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); } g.fillStyle = "#d8b83a"; for (let x = 0; x < 8; x++) g.fillRect(x * 32 + 1, 97, 30, 30); });
tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(10, 1);
const walkMat = toon(0xffffff, { map: tileTex }), siteMat = toon(0x5a5048), kerbMat = toon(0xb4b6bc);
function slab(x0, x1, z0, z1, y, h, m) { return box(x1 - x0, h, z1 - z0, m, (x0 + x1) / 2, y + h / 2, (z0 + z1) / 2); }
slab(-10, 10, 4, 8, -0.05, 0.05, asphalt); slab(4, 8, -10, 4, -0.05, 0.05, asphalt);
slab(-10, 4, 2.5, 4, 0, 0.14, walkMat); slab(2.5, 4, -10, 2.5, 0, 0.14, walkMat);
slab(-10, 10, 8, 10, 0, 0.14, walkMat); slab(8, 10, -10, 8, 0, 0.14, walkMat);
// site ground: packed soil with gravel, around the pit
{
  const gravel = canvasTex(256, 256, (g, w) => { const r = rnd(7); g.fillStyle = "#5e554b"; g.fillRect(0, 0, w, w); for (let i = 0; i < 2600; i++) { const v = 70 + r() * 70; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.beginPath(); g.arc(r() * w, r() * w, 0.6 + r() * 1.8, 0, 7); g.fill(); } });
  gravel.wrapS = gravel.wrapT = THREE.RepeatWrapping; gravel.repeat.set(3, 3);
  const gm = toon(0xffffff, { map: gravel });
  for (const [x0, x1, z0, z1] of [[-10, -1.6, -10, 2.5], [1.6, 2.5, -10, 2.5], [-1.6, 1.6, -10, -4.2], [-1.6, 1.6, -1.0, 2.5]]) slab(x0, x1, z0, z1, 0, 0.12, gm);
  // steel road plates at the gate
  for (let i = 0; i < 3; i++) box(1.5, 0.03, 1.4, toon(0x4a4f58), -2.8, 0.135, 1.6 - i * 1.45, null, 0.02);
}
for (const [x0, x1, z0, z1] of [[-10, 4, 3.94, 4.06], [3.94, 4.06, -10, 4], [-10, 10, 7.94, 8.06], [7.94, 8.06, -10, 8]]) slab(x0, x1, z0, z1, 0, 0.17, kerbMat);
const paint = new THREE.MeshStandardMaterial({ color: 0xe8e8e0, roughness: 0.3, metalness: 0.1, emissive: 0x303030 });
// centre lines stop short of the crossings
for (let x = -9.5; x < -0.5; x += 1.6) box(0.8, 0.012, 0.1, paint, x, 0.006, 6);
for (let z = -9.5; z < -0.5; z += 1.6) box(0.1, 0.012, 0.8, paint, 6, 0.006, z);
// zebra crossings: bars run with the traffic and repeat across the carriageway
for (let i = 0; i < 7; i++) { box(3.2, 0.014, 0.3, paint, 2.1, 0.007, 4.5 + i * 0.5); box(0.3, 0.014, 3.2, paint, 4.5 + i * 0.5, 0.007, 2.1); }
box(0.12, 0.014, 1.8, paint, -0.2, 0.007, 7.0); box(1.8, 0.014, 0.12, paint, 7.0, 0.007, -0.2);
const grate = toon(0x2b2e34);
// manholes, turn arrows, bollards at the corner
const mhTex = canvasTex(128, 128, (g, w) => { g.fillStyle = "#3a3d44"; g.beginPath(); g.arc(64, 64, 63, 0, 7); g.fill(); g.strokeStyle = "#555a64"; g.lineWidth = 3; for (let r = 12; r < 60; r += 10) { g.beginPath(); g.arc(64, 64, r, 0, 7); g.stroke(); } for (let a = 0; a < 12; a++) { g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a / 12 * 6.28) * 60, 64 + Math.sin(a / 12 * 6.28) * 60); g.stroke(); } });
for (const [x, z] of [[-6.2, 6.8], [6.8, -5.4], [2.2, 7.3]]) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), toon(0xffffff, { map: mhTex })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.008, z); scene.add(m); }
for (const [x, z, r] of [[-3, 7, 0], [7, -3, Math.PI / 2]]) { const a = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.12, -0.5), new THREE.Vector2(0.12, -0.5), new THREE.Vector2(0.12, 0.1), new THREE.Vector2(0.3, 0.1), new THREE.Vector2(0, 0.5), new THREE.Vector2(-0.3, 0.1), new THREE.Vector2(-0.12, 0.1)])), paint); a.rotation.set(-Math.PI / 2, 0, r); a.position.set(x, 0.009, z); scene.add(a); }
for (const [x, z] of [[2.7, 3.8], [3.2, 3.8], [3.8, 3.2], [3.8, 2.7]]) { const b = cyl(0.07, 0.08, 0.7, toon(0xf2f2f2), null, 12); b.position.set(x, 0.49, z); const band = cyl(0.081, 0.081, 0.08, glow(0xffc02a), null, 12); band.position.set(x, 0.72, z); }
for (let x = -9.2; x < 3.5; x += 1.4) box(0.6, 0.02, 0.28, grate, x, 0.01, 4.25);
for (let z = -9.2; z < 3.5; z += 1.4) box(0.28, 0.02, 0.6, grate, 4.25, 0.01, z);

const puddles = [];
function puddle(x, z, sx, sz, y = 0.004) {
  const g = new THREE.CircleGeometry(1, 28), p = g.attributes.position, r = rnd(Math.floor(x * 100 + z * 10 + 7));
  for (let i = 1; i < p.count; i++) { const k = 0.8 + r() * 0.35; p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * k); }
  const m = new Reflector(g, { textureWidth: small ? 256 : 512, textureHeight: small ? 256 : 512, color: 0x8890a8, clipBias: 0.003 });
  m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1); m.position.set(x, y, z); noOutline(m.material); scene.add(m); puddles.push({ x, z, sx, sz, y });
}
puddle(1.4, 6.8, 1.4, 0.8); puddle(-5.2, 6.9, 1.1, 0.6); puddle(6.4, -3.5, 0.8, 1.3); puddle(5.4, 2.4, 0.9, 0.7);
puddle(-5.5, -0.8, 1.0, 0.6, 0.125); puddle(-0.4, 1.2, 0.7, 0.45, 0.125);

// ---------- hoarding: white steel panels with a green band, lamps on top ----------
const panelTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#f2f2ee"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#2f8f5a"; g.fillRect(0, h * 0.72, w, h * 0.1);
  g.strokeStyle = "rgba(0,0,0,.08)"; for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
});
const brandTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#f2f2ee"; g.fillRect(0, 0, w, h); g.fillStyle = "#2f8f5a"; g.fillRect(0, h * 0.72, w, h * 0.1);
  g.fillStyle = "#1f3f6a"; g.font = "800 30px 'Helvetica Neue',Arial,sans-serif"; g.textAlign = "center"; // the brand on every third panel: first word large, the rest below it
  const [first, ...rest] = NOTICE.plate.toUpperCase().split(/\s+/);
  const fitTo = (t, px, weight) => { let f = px; do { g.font = `${weight} ${f}px 'Helvetica Neue',Arial,sans-serif`; f -= 1; } while (g.measureText(t).width > w * 0.86 && f > 10); };
  fitTo(first, 30, 800); g.fillText(first, w / 2, h * 0.38);
  if (rest.length) { fitTo(rest.join(" "), 22, 600); g.fillText(rest.join(" "), w / 2, h * 0.52); }
});
const brandM = toon(0xffffff, { map: brandTex });
const panelM = toon(0xffffff, { map: panelTex });
const barricadeLamps = [];
function hoarding(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 1.0), ang = Math.atan2(z1 - z0, x1 - x0);
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
    const p = box(len / n - 0.02, 1.8, 0.05, i % 3 === 1 ? brandM : panelM, x, 1.02, z); p.rotation.y = -ang;
    // Short ground shoes tuck under each panel; a slim cap stiffens the top edge.
    const shoe = box(len / n - 0.08, 0.16, 0.18, EDGE, x, 0.2, z, null, 0.025); shoe.rotation.y = -ang;
    const cap = box(len / n - 0.04, 0.045, 0.09, STEEL, x, 1.94, z, null, 0.018); cap.rotation.y = -ang;
    if (i % 2 === 0) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), glow(0xff3020)); l.position.set(x, 2.0, z); scene.add(l);
      barricadeLamps.push({ m: l, phase: i * 0.7 });
    }
  }
}
hoarding(-10, 2.3, -4.2, 2.3); hoarding(-1.4, 2.3, 2.3, 2.3); hoarding(2.3, 2.3, 2.3, -10);
{ // safety banner on the long side
  const b = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.5), toon(0xffffff, { map: canvasTex(512, 60, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.fillStyle = "#1a8a4a"; g.fillRect(0, 0, 60, h); g.fillStyle = "#fff"; g.font = "900 40px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("+", 30, h / 2 + 2); g.fillStyle = "#1a8a4a"; g.font = `900 38px ${JP}`; g.fillText("安全第一  ご安全に", w / 2 + 30, h / 2 + 2); }) }));
  b.position.set(2.34, 1.45, -5.4); b.rotation.y = Math.PI / 2; scene.add(b);
}
// gate (open), with a sign
for (const x of [-4.2, -1.4]) box(0.12, 2.3, 0.12, toon(0x3a3f4a), x, 1.27, 2.3);
{
  const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.42), glow(0xffffff, { map: canvasTex(512, 84, (g, w, h) => { g.fillStyle = "#1f5f9a"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = `900 48px ${JP}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("工事車両出入口", w / 2, h / 2 + 2); }) }));
  s.position.set(-2.8, 2.35, 2.36); scene.add(s);
}

// ---------- notice board facing the corner (the message lives here) ----------
const noticeTex = canvasTex(1024, 1376, (g, w, h) => {
  // a Japanese site notice with a clear type hierarchy:
  // title 84 > subject 56 > body 52 > end time 50 > client / site 38
  const M = 64, fit = (text, px, weight) => { let size = px; do { g.font = `${weight} ${size}px ${JP}`; size -= 2; } while (g.measureText(text).width > w - 2 * M && size > 18); };
  g.fillStyle = "#fbfaf5"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#1f5f9a"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = "#1f5f9a"; g.fillRect(0, 0, w, 176);
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle"; fit(NOTICE.title, 84, 900); g.fillText(NOTICE.title, w / 2, 92);
  g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.fillStyle = "#5a6270"; g.font = `700 34px ${JP}`; g.fillText("工事件名", M, 262);
  g.fillStyle = "#14202e"; fit(NOTICE.subject, 56, 800); g.fillText(NOTICE.subject, M, 336);
  g.fillStyle = "#d6d0bf"; g.fillRect(M, 376, w - 2 * M, 4);
  g.fillStyle = "#111823"; NOTICE.lines.forEach((l, i) => { fit(l, 52, 600); g.fillText(l, M, 468 + i * 80); });
  let y = 468 + NOTICE.lines.length * 80 + 34;
  if (NOTICE.eta) { g.fillStyle = "#fff1ee"; g.fillRect(M - 16, y - 58, w - 2 * M + 32, 84); g.fillStyle = "#c0392b"; fit(NOTICE.eta, 50, 800); g.fillText(NOTICE.eta, M, y); y += 96; }
  g.fillStyle = "#4a5260"; fit(NOTICE.owner, 38, 600); g.fillText(NOTICE.owner, M, Math.min(y, h - 200));
  g.fillStyle = "#f2c21e"; g.fillRect(0, h - 170, w, 56);
  for (let x = -60; x < w; x += 84) { g.fillStyle = "#1a1a1a"; g.beginPath(); g.moveTo(x, h - 114); g.lineTo(x + 42, h - 170); g.lineTo(x + 84, h - 170); g.lineTo(x + 42, h - 114); g.fill(); }
  g.fillStyle = "#3a4250"; g.textAlign = "center"; fit(NOTICE.site, 38, 700); g.fillText(NOTICE.site, w / 2, h - 50);
});
noticeTex.anisotropy = 16;
const noticeMat = noOutline(new THREE.MeshBasicMaterial({ map: noticeTex, color: 0xe6e2da }));
{
  // big enough to read from the default view, turned toward the camera
  // mounted on the hoarding to the right of the gate, facing the street
  const g = new THREE.Group(); g.position.set(0.35, 0.02, 2.36); g.scale.setScalar(1.5); scene.add(g);
  box(1.5, 1.9, 0.08, DARK, 0, 1.25, -0.03, g, 0.03);
  box(1.58, 0.045, 0.11, STEEL, 0, 2.22, 0.025, g, 0.018);
  box(1.58, 0.045, 0.11, STEEL, 0, 0.28, 0.025, g, 0.018);
  for (const x of [-0.68, 0.68]) for (const y of [0.38, 2.12]) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.014, 8), FASTENER);
    screw.rotation.x = Math.PI / 2; add(screw, g, x, y, 0.036);
  }
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.83), noticeMat); face.position.set(0, 1.25, 0.02); g.add(face);
  box(1.6, 0.08, 0.2, DARK, 0, 2.24, 0.04, g);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.05), glow(0xfff4dc)); bar.position.set(0, 2.19, 0.14); g.add(bar);
  for (const x of [-0.6, 0.6]) {
    box(0.06, 0.4, 0.06, DARK, x, 0.2, 0, g);
    box(0.09, 0.025, 0.1, FASTENER, x, 0.015, 0, g, 0.008);
  }
}

// ---------- site office: two-storey prefab, lit, with a visible interior ----------
const OX0 = -9.6, OX1 = -4.4, OZ0 = -9.6, OZ1 = -6.8, FH = 1.45, OB = 0.12;
const office = new THREE.Group(); scene.add(office);
const cream = toon(0xefe9dc), blueTrim = toon(0x2d5f9a);
const rainGlassTex = canvasTex(256, 512, (g, w, h) => {
  const r = rnd(21);
  for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, l = 20 + r() * 90; const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, "rgba(220,235,255,0)"); gr.addColorStop(1, "rgba(220,235,255,.55)"); g.strokeStyle = gr; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + l); g.stroke(); g.fillStyle = "rgba(230,240,255,.6)"; g.beginPath(); g.arc(x, y + l, 1.6, 0, 7); g.fill(); }
  for (let i = 0; i < 160; i++) { g.fillStyle = "rgba(230,240,255,.35)"; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 1.4, 0, 7); g.fill(); }
});
rainGlassTex.wrapS = rainGlassTex.wrapT = THREE.RepeatWrapping;
const glassMat = noOutline(new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.14, depthWrite: false }));
const streakMat = noOutline(new THREE.MeshBasicMaterial({ map: rainGlassTex, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }));
const posterTex = (hue, text) => canvasTex(256, 360, (g, w, h) => { g.fillStyle = `hsl(${hue},70%,58%)`; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.beginPath(); g.arc(w / 2, h * 0.4, 72, 0, 7); g.fill(); g.fillStyle = `hsl(${hue},70%,28%)`; g.font = `900 46px ${JP}`; g.textAlign = "center"; g.fillText(text, w / 2, h * 0.84); });
const prodColors = [0xe84a4a, 0xf2b01e, 0x3aa0e8, 0x55c07a, 0xf28ac0, 0xffffff];
function officeFloor(level) {
  const y0 = OB + level * (FH + 0.08);
  const W = OX1 - OX0, D = OZ1 - OZ0, cx = (OX0 + OX1) / 2, cz = (OZ0 + OZ1) / 2;
  const fl = new THREE.Group(); fl.position.set(cx, y0, cz); office.add(fl);
  box(W, 0.08, D, toon(0x9a8f7c), 0, 0.04, 0, fl);                                   // floor
  box(W, FH, 0.08, cream, 0, FH / 2, -D / 2 + 0.04, fl);                            // back wall
  box(0.08, FH, D, cream, -W / 2 + 0.04, FH / 2, 0, fl); box(0.08, FH, D, cream, W / 2 - 0.04, FH / 2, 0, fl);
  // front: low wall + big windows + door on the ground floor
  box(W, 0.32, 0.08, cream, 0, 0.16, D / 2 - 0.04, fl);
  box(W, 0.18, 0.08, cream, 0, FH - 0.09, D / 2 - 0.04, fl);
  for (const [w, x] of level === 0 ? [[2.3, -1.4], [1.6, 1.0]] : [[2.5, -1.25], [2.2, 1.35]]) {
    for (const m of [glassMat, streakMat]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, FH - 0.5), m); p.position.set(x, 0.32 + (FH - 0.5) / 2, D / 2 - 0.02); fl.add(p); }
    for (const dx of [-w / 2, w / 2]) box(0.06, FH - 0.5, 0.1, blueTrim, x + dx, 0.32 + (FH - 0.5) / 2, D / 2 - 0.03, fl);
  }
  box(W + 0.12, 0.1, D + 0.12, blueTrim, 0, FH + 0.03, 0, fl, 0.02);             // ceiling / next floor edge
  // interior light (warm) + ceiling panels
  for (const x of [-1.5, 0, 1.5]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.26), glow(0xfff6e2)); l.position.set(x, FH - 0.02, 0); fl.add(l); }
  const L = new THREE.PointLight(0xffe8c4, 7, 6, 1.4); L.position.set(0, FH - 0.2, 0.2); fl.add(L);
  // desks with monitors, chairs
  for (const x of [-1.6, -0.3]) {
    box(1.1, 0.05, 0.6, toon(0xd8d2c4), x, 0.55, -0.55, fl); box(0.05, 0.5, 0.5, DARK, x - 0.5, 0.3, -0.55, fl); box(0.05, 0.5, 0.5, DARK, x + 0.5, 0.3, -0.55, fl);
    box(0.5, 0.32, 0.03, DARK, x, 0.8, -0.72, fl, 0.01);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.26), glow(level ? 0x7ad6ff : 0x9ae8b8)); scr.position.set(x, 0.8, -0.7); fl.add(scr);
    box(0.4, 0.05, 0.4, toon(0x2f5f9a), x, 0.35, -0.05, fl, 0.02); box(0.4, 0.4, 0.05, toon(0x2f5f9a), x, 0.55, 0.14, fl, 0.02);
    // papers, mug
    box(0.22, 0.01, 0.3, WHITE, x + 0.35, 0.585, -0.5, fl); cyl(0.04, 0.04, 0.08, toon(0xe84a4a), fl, 10).position.set(x - 0.38, 0.62, -0.45);
  }
  if (level === 0) {
    // whiteboard with drawings, helmet rack, lockers, coffee maker, water cooler
    const wbTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2a5fb0"; g.lineWidth = 3; g.strokeRect(20, 30, 200, 120); g.beginPath(); g.arc(120, 90, 40, 0, 7); g.stroke(); g.strokeStyle = "#d33"; g.beginPath(); g.moveTo(240, 60); g.lineTo(480, 60); g.moveTo(240, 100); g.lineTo(440, 100); g.moveTo(240, 140); g.lineTo(460, 140); g.stroke(); g.fillStyle = "#222"; g.font = `bold 26px ${JP}`; g.fillText("本日の作業", 250, 200); });
    const wb = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), toon(0xffffff, { map: wbTex })); wb.position.set(1.4, 0.95, -D / 2 + 0.09); fl.add(wb);
    for (let i = 0; i < 5; i++) { const h = add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon([0xffffff, 0xf2c21e, 0xffffff, 0x3a8ae8, 0xffffff][i])), fl, -2.2 + i * 0.25, 1.22, -D / 2 + 0.18); box(0.2, 0.02, 0.24, toon(0xdddddd), 0, 0, 0.03, h); }
    box(1.3, 0.03, 0.1, STEEL, -1.7, 1.12, -D / 2 + 0.12, fl);
    for (let i = 0; i < 3; i++) box(0.34, 1.1, 0.36, toon(0x9aa3b0), W / 2 - 0.3, 0.6, 0.6 - i * 0.4, fl, 0.02);
    box(0.3, 0.36, 0.3, DARK, 0.5, 0.75, -D / 2 + 0.25, fl, 0.03);
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), glow(0xffb45a)); cm.position.set(0.5, 0.82, -D / 2 + 0.41); fl.add(cm);
    box(0.5, 0.5, 0.35, toon(0xd8d2c4), 0.5, 0.25, -D / 2 + 0.25, fl);
  } else {
    // drawing table with blueprints, shelves of binders, a safety poster, a plant
    box(1.4, 0.05, 0.8, toon(0xd8d2c4), 1.3, 0.62, -0.2, fl);
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.66), toon(0xffffff, { map: canvasTex(256, 140, (g, w, h) => { g.fillStyle = "#2a5a9a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#cfe0ff"; g.lineWidth = 1.5; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(10 + i * 20, 10); g.lineTo(10 + i * 20, h - 10); g.stroke(); } g.beginPath(); g.arc(w / 2, h / 2, 40, 0, 7); g.stroke(); }) }));
    bp.rotation.x = -Math.PI / 2; bp.position.set(1.3, 0.652, -0.2); fl.add(bp);
    for (let i = 0; i < 10; i++) box(0.08, 0.3, 0.26, toon(prodColors[i % 6]), -2.3 + i * 0.1, 1.05, -D / 2 + 0.2, fl, 0.01);
    box(1.2, 0.03, 0.3, toon(0xbfb8aa), -1.85, 0.88, -D / 2 + 0.2, fl);
    const ps = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), glow(0xffffff, { map: posterTex(140, "安全第一") })); ps.position.set(0.3, 0.95, -D / 2 + 0.09); fl.add(ps);
    cyl(0.12, 0.1, 0.25, toon(0xb86a3a), fl, 12).position.set(W / 2 - 0.3, 0.2, 0.7);
    add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), toon(0x3a9a5a)), fl, W / 2 - 0.3, 0.52, 0.7);
  }
  return fl;
}
officeFloor(0); officeFloor(1);
{ // roof, signboard, stairs, AC units, spill of warm light
  const cx = (OX0 + OX1) / 2, cz = (OZ0 + OZ1) / 2, W = OX1 - OX0, D = OZ1 - OZ0;
  box(W + 0.2, 0.14, D + 0.2, toon(0x6a707c), cx, OB + 2 * (FH + 0.08) + 0.07, cz, null, 0.03);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.46), glow(0xcfcbc2, { map: canvasTex(640, 88, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.fillStyle = "#1f5f9a"; g.font = `800 50px ${JP}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(NOTICE.site, w / 2, h / 2 + 3); }) }));
  sign.position.set(cx, OB + 2 * (FH + 0.08) + 0.42, OZ1 + 0.02); scene.add(sign);
  box(3.5, 0.52, 0.06, DARK, cx, OB + 2 * (FH + 0.08) + 0.42, OZ1 - 0.02);
  // external stair along the right side
  const st = new THREE.Group(); st.position.set(OX1 + 0.45, OB, OZ0 + 0.3); scene.add(st);
  for (let i = 0; i < 9; i++) box(0.7, 0.05, 0.28, STEEL, 0, 0.17 + i * 0.165, i * 0.26, st);
  for (const x of [-0.36, 0.36]) { const r = box(0.04, 0.04, 2.8, STEEL, x, 1.2, 1.1, st); r.rotation.x = -0.56; }
  box(0.8, 0.06, 0.9, STEEL, 0, FH + 0.12, 2.6, st);
  for (const z of [-7.8, -8.9]) box(0.7, 0.55, 0.35, toon(0xe6e6e0), OX0 - 0.3, OB + 0.3, z, null, 0.04);
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.4), noOutline(new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
  spill.rotation.x = -Math.PI / 2; spill.position.set(cx, 0.126, OZ1 + 1.2); scene.add(spill);
  // umbrella stand and a couple of bicycles by the office
  const ug = new THREE.Group(); ug.position.set(OX1 - 0.4, 0.12, OZ1 + 0.4); scene.add(ug);
  cyl(0.2, 0.18, 0.5, toon(0x7a808c), ug, 14).position.y = 0.25;
  [0x3a8ae8, 0xf2f2f2, 0x3a3a3a].forEach((c, i) => { const u = cyl(0.03, 0.08, 0.85, toon(c), ug, 8); u.position.set(-0.07 + i * 0.07, 0.65, 0); u.rotation.z = (i - 1) * 0.1; });
}
// the office door opens now and then
const officeDoor = new THREE.Group(); officeDoor.position.set((OX0 + OX1) / 2 + 2.05, OB + 0.08 + 0.62, OZ1 - 0.04); scene.add(officeDoor);
box(0.62, 1.24, 0.05, toon(0x9aa3b0), 0.31, 0, 0, officeDoor);
{ const w = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5), glow(0xfff0d0)); w.position.set(0.31, 0.25, 0.03); officeDoor.add(w); }

// ---------- heavy plant and materials ----------
// crawler crane lowering a tunnel segment into the shaft
const crane = new THREE.Group(); crane.position.set(-4.4, 0.12, -2.6); scene.add(crane);
for (const z of [0.7, -0.7]) box(2.8, 0.5, 0.5, RUBBER, 0, 0.25, z, crane, 0.2);
const cTop = new THREE.Group(); cTop.position.y = 0.55; crane.add(cTop);
box(2.0, 0.9, 1.5, YELLOW, -0.3, 0.45, 0, cTop, 0.08);
box(0.8, 0.9, 0.7, YELLOW, 0.6, 1.0, 0.45, cTop, 0.06);
box(0.7, 0.55, 0.72, glassMat, 0.62, 1.1, 0.45, cTop);
box(0.8, 0.7, 1.4, YELLOW_D, -1.25, 0.6, 0, cTop, 0.1);
const cBoom = new THREE.Group(); cBoom.position.set(0.6, 0.6, -0.2); cTop.add(cBoom);
{
  const L = 6.0; const boomM = toon(0xf2b01e);
  for (const [y, z] of [[0.18, 0.18], [0.18, -0.18], [-0.18, 0.18], [-0.18, -0.18]]) box(L, 0.05, 0.05, boomM, L / 2, y, z, cBoom);
  for (let x = 0.3; x < L; x += 0.5) { const d = box(0.04, 0.5, 0.04, boomM, x, 0, 0.18, cBoom); d.rotation.z = 0.7; const d2 = box(0.04, 0.5, 0.04, boomM, x, 0, -0.18, cBoom); d2.rotation.z = -0.7; }
  box(0.3, 0.3, 0.3, DARK, L, 0, 0, cBoom, 0.04);
}
cBoom.rotation.z = 0.78; cTop.rotation.y = -0.05;
const hookGroup = new THREE.Group(); scene.add(hookGroup);
const hookCable = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), toon(0xcfd3d8)), hookGroup);
const hookBlock = box(0.22, 0.26, 0.22, YELLOW, 0, 0, 0, hookGroup, 0.04);
const segment = add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.45, 24, 1, true, 0, Math.PI / 2.4), toon(0x9aa3ad, { side: THREE.DoubleSide })), hookGroup);
// excavator parked for the night
{
  const ex = new THREE.Group(); ex.position.set(-1.6, 0.12, -7.4); ex.rotation.y = 0.5; scene.add(ex);
  for (const z of [0.5, -0.5]) box(2.2, 0.42, 0.4, RUBBER, 0, 0.21, z, ex, 0.18);
  const top = new THREE.Group(); top.position.y = 0.48; ex.add(top);
  box(1.6, 0.6, 1.2, YELLOW, -0.2, 0.3, 0, top, 0.08); box(0.7, 0.8, 0.62, YELLOW, 0.3, 0.9, 0.24, top, 0.06); box(0.62, 0.5, 0.64, glassMat, 0.33, 0.98, 0.24, top);
  const boom = new THREE.Group(); boom.position.set(0.5, 0.5, -0.2); boom.rotation.z = 0.9; top.add(boom);
  box(2.0, 0.24, 0.22, YELLOW, 1.0, 0, 0, boom, 0.08);
  const stick = new THREE.Group(); stick.position.x = 2.0; stick.rotation.z = -2.1; boom.add(stick);
  box(1.4, 0.18, 0.18, YELLOW_D, 0.7, 0, 0, stick, 0.06);
  box(0.45, 0.4, 0.5, STEEL, 1.5, -0.1, 0, stick, 0.1);
}
// dump truck with a tarp, generator, light tower, segment stacks, rebar, sandbags, portable toilets
{
  const tr = new THREE.Group(); tr.position.set(-7.4, 0.12, -4.4); tr.rotation.y = Math.PI / 2; scene.add(tr);
  box(3.2, 0.24, 1.0, DARK, 0, 0.5, 0, tr, 0.04);
  box(0.95, 0.95, 1.15, toon(0x2f6fd0), 1.15, 1.05, 0, tr, 0.12); box(0.46, 0.42, 1.0, glassMat, 1.45, 1.26, 0, tr);
  box(2.0, 0.66, 1.2, STEEL, -0.6, 0.95, 0, tr, 0.05);
  box(2.05, 0.08, 1.25, toon(0x2f8f5a), -0.6, 1.32, 0, tr, 0.04);
  for (const [x, z] of [[-1.1, 0.55], [-1.1, -0.55], [-0.3, 0.55], [-0.3, -0.55], [1.15, 0.55], [1.15, -0.55]]) { const w = cyl(0.32, 0.32, 0.26, RUBBER, tr, 18); w.rotation.x = Math.PI / 2; w.position.set(x, 0.32, z); }
}
box(1.5, 0.85, 0.8, toon(0x2f7d4a), 1.3, 0.55, -8.6, null, 0.08);
{
  const lt = new THREE.Group(); lt.position.set(1.4, 0.12, -6.9); scene.add(lt);
  box(1.2, 0.4, 0.8, YELLOW, 0, 0.3, 0, lt, 0.06);
  cyl(0.06, 0.07, 3.6, STEEL, lt, 10).position.y = 2.2;
  box(1.2, 0.08, 0.08, STEEL, 0, 4.0, 0, lt);
  const lamps = [[-0.4, 4.25], [0.4, 4.25], [-0.4, 3.9], [0.4, 3.9]];
  for (const [x, y] of lamps) { box(0.34, 0.26, 0.16, DARK, x, y, 0, lt, 0.03); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), glow(0xfff4dc)); f.position.set(x, y, 0.09); lt.add(f); }
  const s = new THREE.SpotLight(0xfff0d8, 70, 20, 0.8, 0.6, 1.3); s.position.set(1.4, 4.3, -6.8); s.target.position.set(-1, 0, -2.6);
  s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0004; scene.add(s, s.target);
}
for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
  const seg = add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.45, 24, 1, true, 0, Math.PI / 2.4), toon(0x9aa3ad, { side: THREE.DoubleSide })), null, -8.2 + j * 1.3, 0.3 + i * 0.22, -1.6);
  seg.rotation.set(0, 0, Math.PI / 2); seg.scale.set(0.6, 1, 0.6);
}
{
  const rb = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 3.2, 5), toon(0x7a4a2a), 40), d = new THREE.Object3D();
  for (let i = 0; i < 40; i++) { d.position.set(-5.8, 0.16 + (i % 5) * 0.05, 0.9 + Math.floor(i / 5) * 0.05); d.rotation.set(0, 0, Math.PI / 2); d.updateMatrix(); rb.setMatrixAt(i, d.matrix); }
  rb.castShadow = true; scene.add(rb);
  for (let i = 0; i < 8; i++) box(0.5, 0.2, 0.32, toon(0xcdbf9a), 0.9 + (i % 4) * 0.52, 0.22 + Math.floor(i / 4) * 0.2, 1.7, null, 0.08);
  for (const [x, c] of [[-9.6, 0x3a8ae8], [-8.9, 0x3a8ae8]]) { box(0.6, 1.6, 0.6, toon(c), x, 0.92, -5.6, null, 0.06); box(0.64, 0.08, 0.64, toon(0xf2f2f2), x, 1.76, -5.6, null, 0.03); }
}

// a cat asleep on the office step, out of the rain
{
  const cat = new THREE.Group(); cat.position.set(-5.2, 0.2, -6.55); cat.rotation.y = 0.4; scene.add(cat);
  box(0.9, 0.05, 0.45, toon(0x8a8f98), 0, -0.04, 0, cat);
  const body = add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), toon(0xf2a24a)), cat, 0, 0.1, 0); body.scale.set(1.4, 0.75, 1);
  const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), toon(0xf2a24a)), cat, 0.2, 0.1, 0.05);
  for (const z of [0.0, 0.1]) { const ear = add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), toon(0xf2a24a)), cat, 0.22, 0.19, z); }
  const tail = add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 12, Math.PI), toon(0xd8863a)), cat, -0.12, 0.05, 0.08); tail.rotation.x = Math.PI / 2;
}
// ---------- lane closure on the front road ----------
const cones = [];
for (let i = 0; i < 6; i++) {
  const x = -8.6 + i * 1.45, z = 4.9;
  const c = add(new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.55, 16), ORANGE), null, x, 0.275, z);
  box(0.38, 0.04, 0.38, DARK, 0, -0.26, 0, c);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 16, 1, true), noOutline(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x777777 }))); band.position.y = 0.05; c.add(band);
  cones.push(c);
  if (i < 5) { const bar = box(1.32, 0.05, 0.05, toon(0xffffff), x + 0.725, 0.45, z); const stripes = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.052, 0.052), toon(0xe83a2a)); bar.add(stripes); }
}
// LED arrow board on a small trailer, sequential chevrons
const arrowCells = [];
{
  const g = new THREE.Group(); g.position.set(-9.3, 0, 4.5); g.rotation.y = 0.25; g.scale.setScalar(0.9); scene.add(g);
  box(1.4, 0.2, 0.9, DARK, 0, 0.45, 0, g, 0.04);
  for (const z of [0.42, -0.42]) { const w = cyl(0.22, 0.22, 0.14, RUBBER, g, 16); w.rotation.x = Math.PI / 2; w.position.set(0, 0.22, z); }
  cyl(0.05, 0.05, 1.4, STEEL, g, 8).position.set(0, 1.2, 0);
  box(1.3, 0.9, 0.1, toon(0x151619), 0, 2.1, 0, g, 0.03);
  for (let k = 0; k < 3; k++) { // three chevrons pointing left
    const cell = new THREE.Group(); cell.position.set(0.35 - k * 0.32, 2.1, 0.06); g.add(cell);
    for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), glow(0xffa21a)); const t = i - 2; d.position.set(Math.abs(t) * 0.07, t * 0.1, 0); cell.add(d); }
    arrowCells.push(cell);
  }
}
// stand sign at the start of the closure
{
  const g = new THREE.Group(); g.position.set(-9.2, 0, 5.6); g.rotation.y = 0.35; scene.add(g);
  for (const x of [-0.35, 0.35]) { const leg = box(0.05, 1.1, 0.05, DARK, x, 0.55, 0, g); leg.rotation.x = 0.12; }
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.95), toon(0xffffff, { map: canvasTex(256, 304, (c, w, h) => {
    c.fillStyle = "#f2c21e"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.fillRect(12, 12, w - 24, h - 24);
    c.fillStyle = "#1a1a1a"; c.textAlign = "center"; c.font = `900 50px ${JP}`; c.fillText("この先", w / 2, 88); c.fillText("工事中", w / 2, 150);
    c.fillStyle = "#c0392b"; c.font = `800 40px ${JP}`; c.fillText("通行注意", w / 2, 230);
  }) }));
  face.position.set(0, 0.95, 0.04); g.add(face);
}
// rotating beacons on the gate and the crane
const beacons = [];
function beacon(x, y, z, parent) {
  const g = new THREE.Group(); g.position.set(x, y, z); (parent || scene).add(g);
  cyl(0.09, 0.1, 0.16, noOutline(new THREE.MeshBasicMaterial({ color: 0xffa21a, transparent: true, opacity: 0.85, toneMapped: false })), g, 16);
  const l = new THREE.SpotLight(0xff9a1a, 18, 8, 0.5, 0.6, 1.5); l.position.set(0, 0, 0); g.add(l);
  const tgt = new THREE.Object3D(); tgt.position.set(3, -0.8, 0); g.add(tgt); l.target = tgt;
  beacons.push(g);
}
beacon(-4.2, 2.52, 2.3); beacon(-1.4, 2.52, 2.3); beacon(0.6, 1.95, 0.45, cTop);

// ---------- the street corner around the site ----------
const halos = [];
const haloTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
function halo(pos, color, size, parent) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.8 })); s.position.copy(pos); s.scale.setScalar(size); (parent || scene).add(s); halos.push(s); return s; }
function streetLamp(x, z, armDir) {
  const g = new THREE.Group(); g.position.set(x, 0.14, z); scene.add(g);
  box(0.42, 0.08, 0.42, DARK, 0, 0.04, 0, g, 0.035);
  for (const px of [-0.14, 0.14]) for (const pz of [-0.14, 0.14]) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 8), FASTENER); add(bolt, g, px, 0.09, pz);
  }
  cyl(0.06, 0.08, 4.6, toon(0x5a606c), g, 10).position.y = 2.3;
  box(1.0, 0.06, 0.06, toon(0x5a606c), armDir * 0.5, 4.55, 0, g);
  box(0.06, 0.32, 0.06, toon(0x5a606c), armDir * 0.16, 4.38, 0, g, 0.02);
  box(0.5, 0.12, 0.28, toon(0x3a3f4a), armDir * 0.95, 4.5, 0, g, 0.03);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.2), glow(0xfff2d0)); bulb.position.set(armDir * 0.95, 4.43, 0); g.add(bulb);
  const s = new THREE.SpotLight(0xffe7c0, 24, 12, 0.8, 0.7, 1.5); s.position.set(x + armDir * 0.95, 4.5, z); s.target.position.set(x + armDir * 1.2, 0, z);
  s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; scene.add(s, s.target);
  halo(new THREE.Vector3(x + armDir * 0.95, 4.4, z), 0xffe0b0, 0.9);
}
streetLamp(3.25, -1.2, 1); streetLamp(9.1, -6.5, -1); streetLamp(-7.5, 9.1, 1);
const poleTop = [];
function pole(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0.14, z); scene.add(g);
  box(0.42, 0.08, 0.42, DARK, 0, 0.04, 0, g, 0.03);
  cyl(0.1, 0.13, 6.4, toon(0x8a8680), g, 12).position.y = 3.2;
  box(1.4, 0.08, 0.1, toon(0x5a5650), 0, 6.0, 0, g); box(1.0, 0.08, 0.1, toon(0x5a5650), 0, 5.6, 0, g);
  cyl(0.18, 0.18, 0.45, toon(0x6a6a70), g, 12).position.set(0.3, 5.1, 0.15);
  for (const dx of [-0.6, 0, 0.6]) cyl(0.03, 0.04, 0.12, toon(0xdddddd), g, 8).position.set(dx, 6.1, 0);
  box(0.6, 0.2, 0.03, glow(0xffffff, { map: canvasTex(128, 40, (c, w, h) => { c.fillStyle = "#1b5ea8"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.font = `bold 22px ${JP}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(NOTICE.address, w / 2, h / 2); }) }), 0, 2.4, 0.14, g);
  poleTop.push(new THREE.Vector3(x, 6.24, z));
}
pole(-9.3, 3.4); pole(-6.6, 3.45); pole(3.4, -2.6); pole(3.4, -9.3); pole(9.2, 9.2);
const wireMat = toon(0x15171b);
function wire(a, b, sag, dy) { const p0 = a.clone().add(new THREE.Vector3(0, dy, 0)), p1 = b.clone().add(new THREE.Vector3(0, dy, 0)); const mid = p0.clone().lerp(p1, 0.5); mid.y -= sag; add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, mid, p1), 24, 0.01, 4, false), wireMat)).castShadow = false; }
wire(poleTop[0], poleTop[1], 0.7, 0); wire(poleTop[1], poleTop[2], 0.8, 0); wire(poleTop[2], poleTop[3], 0.7, 0); wire(poleTop[0], poleTop[1], 0.6, -0.2);
const signals = [];
function signal(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0.14, z); g.rotation.y = ry; scene.add(g);
  box(0.38, 0.07, 0.38, DARK, 0, 0.035, 0, g, 0.025);
  cyl(0.06, 0.07, 4.2, toon(0x6a707c), g, 10).position.y = 2.1;
  box(0.06, 0.06, 1.2, toon(0x6a707c), 0, 4.1, 0.6, g); box(0.3, 0.28, 1.05, toon(0x3a3f4a), 0, 4.1, 1.25, g, 0.04);
  const lamps = [0x2aff8a, 0xffc02a, 0xff3a3a].map((c, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), glow(c)); m.position.set(0.16, 4.1, 0.92 + i * 0.33); m.rotation.y = Math.PI / 2; g.add(m); return m; });
  for (let i = 0; i < 3; i++) { const hood = box(0.12, 0.035, 0.17, EDGE, 0.19, 4.1, 0.92 + i * 0.33, g, 0.012); hood.rotation.y = Math.PI / 2; }
  box(0.2, 0.46, 0.26, toon(0x3a3f4a), 0.1, 2.6, 0, g, 0.03);
  const ped = [0x3aa0ff, 0xff3a3a].map((c, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), glow(c)); m.position.set(0.21, 2.74 - i * 0.24, 0); m.rotation.y = Math.PI / 2; g.add(m); return m; });
  signals.push({ lamps, ped, halo: halo(new THREE.Vector3(), 0xffffff, 0.5) });
}
signal(3.6, 3.7, 0); signal(8.4, 8.4, Math.PI);
for (let i = 0; i < 4; i++) { box(0.9, 0.16, 0.05, toon(0xf2f2f2), 5.2 + i * 1.0, 0.8, 8.25, null, 0.02); box(0.05, 0.7, 0.05, toon(0xb0b4bc), 4.75 + i * 1.0, 0.5, 8.25); }
{ // vending machine on the far corner: the one bright colour in the rain
  const g = new THREE.Group(); g.position.set(9.2, 0.14, 5.6); g.rotation.y = -Math.PI / 2; scene.add(g);
  box(0.9, 1.85, 0.7, toon(0xd8322a), 0, 0.93, 0, g, 0.05);
  box(0.94, 0.07, 0.74, DARK, 0, 0.035, 0, g, 0.02);
  box(0.82, 0.035, 0.025, FASTENER, 0, 1.78, 0.36, g, 0.01);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 1.0), glow(0xffffff, { map: canvasTex(128, 170, (c, w, h) => { c.fillStyle = "#f4fbff"; c.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) { c.fillStyle = ["#e84a4a", "#3aa0e8", "#55c07a", "#f2b01e", "#ffffff", "#9a6ad8"][(i + r) % 6]; c.fillRect(8 + i * 19, 10 + r * 40, 13, 26); } }) }));
  face.position.set(0, 1.28, 0.36); g.add(face);
  box(0.22, 0.26, 0.025, toon(0x4a535d), 0.23, 0.42, 0.37, g, 0.012);
  box(0.15, 0.025, 0.02, FASTENER, 0.23, 0.31, 0.39, g, 0.008);
  const l = new THREE.PointLight(0xdff0ff, 1.6, 3, 2); l.position.set(0, 1.3, 0.8); g.add(l);
  halo(new THREE.Vector3(8.8, 1.42, 5.6), 0xe0f0ff, 0.8);
}
{ // a small house across the right road, one window lit
  const g = new THREE.Group(); g.position.set(8.9, 0.14, -8.6); scene.add(g);
  box(1.8, 2.4, 2.6, toon(0xd8cfc0), 0, 1.2, 0, g);
  const roof = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.9, 1.0, 4, 1), toon(0x3a4a5a)), g, 0, 2.9, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(0.8, 1, 1.1);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), glow(0xffd28a)); win.position.set(-0.91, 1.5, 0.4); win.rotation.y = -Math.PI / 2; g.add(win);
}

// ---------- rain, drips, ripples ----------
const RAIN = small ? 1100 : 1900;
const rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAIN * 6), rainSpeed = new Float32Array(RAIN), rr = rnd(9);
for (let i = 0; i < RAIN; i++) { const x = -10 + rr() * 20, y = rr() * 6.5, z = -10 + rr() * 20; rainPos.set([x, y, z, x + 0.05, y - 0.26, z + 0.02], i * 6); rainSpeed[i] = 9 + rr() * 4; }
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
const rainMat = noOutline(new THREE.LineBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.2, depthWrite: false }));
scene.add(new THREE.LineSegments(rainGeo, rainMat));
const ripples = [], rippleGeo = new THREE.RingGeometry(0.7, 1, 24);
for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(rippleGeo, noOutline(new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0, depthWrite: false }))); m.rotation.x = -Math.PI / 2; scene.add(m); ripples.push({ m, t: rr() }); }
function placeRipple(o) {
  if (rr() < 0.55) { const p = puddles[Math.floor(rr() * puddles.length)]; o.m.position.set(p.x + (rr() - 0.5) * p.sx * 1.2, p.y + 0.006, p.z + (rr() - 0.5) * p.sz * 1.2); }
  else { const road = rr() < 0.6; o.m.position.set(-9.5 + rr() * 19, road ? 0.006 : 0.15, road ? 4.2 + rr() * 3.6 : 8.2 + rr() * 1.6); }
}
ripples.forEach(placeRipple);
const drips = [];
for (let i = 0; i < 12; i++) {
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), noOutline(new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.8 })));
  const top = i < 7 ? OB + 2 * (FH + 0.08) + 0.0 : 2.28, x = i < 7 ? OX0 + 0.4 + i * 0.75 : 0.8 + (i - 7) * 0.3, z = i < 7 ? OZ1 + 0.12 : 2.52;
  d.position.set(x, top, z); scene.add(d); drips.push({ d, top, t: rr() * 2 });
}

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x6b7fb0, 0x1a1a24, 0.9); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9bb0ff, 0.5); moon.position.set(-14, 22, 10); moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); moon.shadow.bias = -0.0005;
scene.add(moon);

const fill = new THREE.DirectionalLight(0xa9b8e8, 0.55); fill.position.set(18, 6, 24); scene.add(fill);
const fill2 = new THREE.DirectionalLight(0x7f8fc0, 0.35); fill2.position.set(-20, 4, 14); scene.add(fill2);


// ---------- four seasons ----------
// Each season holds for SEASON seconds and hands over to the next in FADE.
const SEASON = 40, FADE = 8;
const SEASONS = ["spring", "summer", "autumn", "winter"];
function seasonWeights(time) {
  const i = Math.floor(time / SEASON) % 4, local = time % SEASON, w = [0, 0, 0, 0];
  const f = Math.max(0, (local - (SEASON - FADE)) / FADE), k = f * f * (3 - 2 * f);
  w[i] = 1 - k; w[(i + 1) % 4] = k;
  return { w, index: i, local };
}
const leafTex = (paint) => canvasTex(64, 64, paint);
const petalTex = leafTex((g) => { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(32, 32, 14, 24, 0.5, 0, 7); g.fill(); g.clearRect(28, 4, 8, 10); });
const mapleTex = leafTex((g) => { g.fillStyle = "#fff"; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 12 : 28; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.closePath(); g.fill(); });
const snowTex = leafTex((g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
function flakes(count, tex, size, colors, seed) {
  const r = rnd(seed), pos = new Float32Array(count * 3), col = new Float32Array(count * 3), ph = new Float32Array(count), c = new THREE.Color();
  for (let i = 0; i < count; i++) { pos.set([-10 + r() * 20, r() * 8, -10 + r() * 20], i * 3); c.setHex(colors[Math.floor(r() * colors.length)]); col.set([c.r, c.g, c.b], i * 3); ph[i] = r() * 6.28; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = noOutline(new THREE.PointsMaterial({ map: tex, size, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, alphaTest: 0.05 }));
  const pts = new THREE.Points(g, m); scene.add(pts);
  return { pos, ph, m, g, count, r };
}
const petals = flakes(small ? 220 : 420, petalTex, 0.28, [0xffc8dc, 0xffb0cc, 0xfff0f4], 51);
const leaves = flakes(small ? 200 : 380, mapleTex, 0.32, [0xe8482a, 0xf2922a, 0xd8b02a, 0xb83a1e], 52);
const snow = flakes(small ? 900 : 1700, snowTex, 0.2, [0xffffff, 0xeef4ff], 53);
function drift(f, dt, fall, sway, spin) {
  for (let i = 0; i < f.count; i++) {
    const k = i * 3; f.ph[i] += dt * spin;
    f.pos[k] += (Math.sin(f.ph[i]) * sway + 0.25 * sway) * dt; f.pos[k + 1] -= fall * dt * (0.7 + (i % 7) * 0.06); f.pos[k + 2] += Math.cos(f.ph[i] * 0.7) * sway * 0.6 * dt;
    if (f.pos[k + 1] < 0.05) { f.pos[k] = -10 + f.r() * 20; f.pos[k + 1] = 6 + f.r() * 2.5; f.pos[k + 2] = -10 + f.r() * 20; }
    if (f.pos[k] > 10) f.pos[k] = -10;
  }
  f.g.attributes.position.needsUpdate = true;
}
// street trees whose crowns follow the seasons
const crownMat = toon(0x6aa84a), barkMat = toon(0x5a4030), snowCapMat = toon(0xffffff, { transparent: true, opacity: 0 });
const crowns = [], caps = [];
function tree(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0.14, z); g.scale.setScalar(s); scene.add(g);
  box(0.5, 0.06, 0.5, toon(0x3a3028), 0, 0.03, 0, g);
  // the trunk runs up into the crown, so the foliage always sits on it
  cyl(0.06, 0.1, 2.4, barkMat, g, 8).position.y = 1.2;
  const crown = new THREE.Group(); crown.position.y = 2.2; g.add(crown); crowns.push(crown);
  const r = rnd(Math.floor(x * 31 + z * 7 + 99));
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), crownMat), crown, 0, 0, 0);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + r() * 0.5; add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 + r() * 0.12, 1), crownMat), crown, Math.cos(a) * 0.36, (r() - 0.4) * 0.3, Math.sin(a) * 0.36); }
  for (let i = 0; i < 4; i++) { const c = add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), snowCapMat), crown, (r() - 0.5) * 0.5, 0.35 + r() * 0.2, (r() - 0.5) * 0.5); c.scale.y = 0.4; caps.push(c); }
}
tree(-8.0, 3.6, 0.85); tree(3.6, -5.6, 0.85); tree(3.6, -8.4, 0.85); tree(-5.6, 9.1, 0.9);
// snow cover: thin sheets that thicken through the winter
const snowSheetMat = toon(0xf4f8ff, { transparent: true, opacity: 0 }), slushMat = noOutline(new THREE.MeshBasicMaterial({ color: 0xd8e2f0, transparent: true, opacity: 0, depthWrite: false }));
function sheet(x0, x1, z0, z1, y, m = snowSheetMat) { const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); p.receiveShadow = true; noOutline(p.material); scene.add(p); return p; }
sheet(-10, 4, 2.5, 3.94, 0.145); sheet(2.5, 3.94, -10, 2.5, 0.146); sheet(-10, 10, 8.06, 10, 0.145); sheet(8.06, 10, -10, 8, 0.146);
sheet(-10, -1.6, -10, 2.2, 0.125); sheet(1.6, 2.2, -10, 2.2, 0.126); sheet(-1.6, 1.6, -10, -4.35, 0.125); sheet(-1.6, 1.6, -0.85, 2.2, 0.125);
sheet(OX0 - 0.1, OX1 + 0.1, OZ0 - 0.1, OZ1 + 0.1, OB + 2 * (FH + 0.08) + 0.15);
sheet(-10, 10, 4, 7.94, 0.01, slushMat); sheet(4, 7.94, -10, 4, 0.011, slushMat);
const seasonFog = { spring: new THREE.Color(0x2c2640), summer: new THREE.Color(0x1a2238), autumn: new THREE.Color(0x2c2430), winter: new THREE.Color(0x323a50) };
const seasonSky = { spring: new THREE.Color(0x8a7fb0), summer: new THREE.Color(0x6b7fb0), autumn: new THREE.Color(0x9a7f80), winter: new THREE.Color(0x9fb0d8) };
const crownColor = { spring: new THREE.Color(0xffb8d0), summer: new THREE.Color(0x4f9a42), autumn: new THREE.Color(0xe06a2a), winter: new THREE.Color(0x4a6a52) };
const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
let snowDepth = 0;
function applySeasons(dt) {
  const { w, index, local } = seasonWeights(t);
  const [sp, su, au, wi] = w;
  const mix = (table, out) => { out.setRGB(0, 0, 0); SEASONS.forEach((k, i) => out.add(tmpC2.copy(table[k]).multiplyScalar(w[i]))); return out; };
  scene.fog.color.copy(mix(seasonFog, tmpC));
  hemi.color.copy(mix(seasonSky, tmpC)); hemi.intensity = 0.9 + wi * 0.5;
  crownMat.color.copy(mix(crownColor, tmpC));
  // precipitation
  const rainAmt = su + sp * 0.35 + au * 0.25;
  rainMat.opacity = 0.16 * rainAmt; streakMat.opacity = 0.8 * (su + sp * 0.4 + au * 0.3);
  ripples.forEach((o) => { o.m.material.opacity *= rainAmt; });
  drips.forEach((o) => { o.d.visible = rainAmt > 0.2; });
  petals.m.opacity = sp * 0.95; leaves.m.opacity = au * 0.95; snow.m.opacity = wi * 0.9;
  if (sp > 0.01) drift(petals, dt, 0.6, 0.7, 1.4);
  if (au > 0.01) drift(leaves, dt, 0.9, 0.9, 2.2);
  if (wi > 0.01) drift(snow, dt, 0.8, 0.25, 0.8);
  // snow builds during winter and melts as spring arrives
  snowDepth += (index === 3 ? 0.045 : -0.12) * dt; snowDepth = Math.min(1, Math.max(0, snowDepth));
  snowSheetMat.opacity = snowDepth * 0.92; slushMat.opacity = snowDepth * 0.35; snowCapMat.opacity = snowDepth;
}

// ---------- rendering: toon outlines, then bloom on the lights only ----------
const outline = new OutlineEffect(renderer, { defaultThickness: 0.0032, defaultColor: [0.05, 0.05, 0.09], defaultAlpha: 0.9 });
class ToonPass extends Pass {
  constructor() { super(); this.needsSwap = false; }
  render(r, writeBuffer, readBuffer) { r.setRenderTarget(readBuffer); r.clear(); r.render(scene, camera); outline.renderOutline(scene, camera); }
}
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: small ? 2 : 4, type: THREE.HalfFloatType }));
composer.addPass(new ToonPass());
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.45, 0.95);
composer.addPass(bloom); composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, canvas);
controls.target.set(0.2, 0.4, -0.2);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.minDistance = 12; controls.maxDistance = 60; controls.maxPolarAngle = 1.45; controls.minPolarAngle = 0.25; controls.enablePan = false;
const still = new URLSearchParams(location.search).has("still");
controls.autoRotate = !reduced && !still; controls.autoRotateSpeed = 0.25;
const HOME_AZ = Math.atan2(7.1 - 0.2, 34.5 + 0.2), SWAY = 0.44;
let idle;
controls.addEventListener("start", () => { controls.autoRotate = false; clearTimeout(idle); });
controls.addEventListener("end", () => { clearTimeout(idle); idle = setTimeout(() => { controls.autoRotate = !reduced; }, 6000); });
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
  camera.aspect = w / h; camera.fov = w / h < 1 ? 50 : 32;
  // keep the model clear of the text: right of it on wide screens, above it on tall ones
  if (w / h > 1.25) camera.setViewOffset(w, h, -w * 0.11, h * 0.02, w, h);
  else if (w / h < 0.9) camera.setViewOffset(w, h, 0, h * 0.17, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();

// ---------- the stage around the model ----------
// The diorama stands on a dark floor that fades into the night, with a soft
// contact shadow and out-of-focus city lights far away, so it sits in a shot
// instead of floating on a flat gradient.
const bokeh = [];
{
  const floorTex = canvasTex(512, 512, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, "rgba(60,70,104,0.6)"); gr.addColorStop(0.3, "rgba(40,48,78,0.38)"); gr.addColorStop(1, "rgba(26,34,56,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 64), noOutline(new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false, fog: false })));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -PL - 0.22; scene.add(floor);
  const shadowTex = canvasTex(256, 256, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w / 2);
    gr.addColorStop(0, "rgba(0,0,0,0.8)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(S * 2, S * 2), noOutline(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, fog: false })));
  contact.rotation.x = -Math.PI / 2; contact.position.y = -PL - 0.21; scene.add(contact);
  const dot = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.75, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.fill();
  });
  const cols = [0xffb870, 0xffd9a0, 0x8fb4ff, 0xff6a5a, 0xa8c8ff, 0xffe8c0];
  const r = rnd(77);
  for (let i = 0; i < 44; i++) {
    const a = Math.PI * (0.85 + r() * 1.3), d = 42 + r() * 42;
    const m = new THREE.SpriteMaterial({ map: dot, color: cols[i % cols.length], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
    const sp = new THREE.Sprite(m), sz = 0.8 + r() * 2.2; sp.scale.set(sz, sz, 1);
    sp.position.set(Math.cos(a) * d, -5 - r() * 24, Math.sin(a) * d); scene.add(sp);
    bokeh.push({ m, base: 0.06 + r() * 0.14, ph: r() * 6.28, sp: 0.15 + r() * 0.5 });
  }
}

// ---------- motion ----------
const tipLocal = new THREE.Vector3(6.0, 0, 0), tip = new THREE.Vector3();
// ?season=spring|summer|autumn|winter starts the cycle there (for previews)
const START = { spring: 0, summer: SEASON, autumn: SEASON * 2, winter: SEASON * 3 }[new URLSearchParams(location.search).get("season")] ?? 0;
let last = performance.now(), t = START + 1, doorA = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!document.hidden) t += dt;
  const live = reduced ? 0.15 : 1;
  for (let i = 0; i < RAIN; i++) { const k = i * 6, dy = rainSpeed[i] * dt * live; rainPos[k + 1] -= dy; rainPos[k + 4] -= dy; rainPos[k] += dy * 0.12; rainPos[k + 3] += dy * 0.12; if (rainPos[k + 4] < 0) { const y = 5.5 + rr() * 1.2, x = -10 + rr() * 20; rainPos[k + 1] = y; rainPos[k + 4] = y - 0.26; rainPos[k] = x; rainPos[k + 3] = x + 0.05; } }
  rainGeo.attributes.position.needsUpdate = true;
  ripples.forEach((o) => { o.t += dt * 1.6 * live; if (o.t >= 1) { o.t = 0; placeRipple(o); } const s = 0.04 + o.t * 0.28; o.m.scale.set(s, s, s); o.m.material.opacity = (1 - o.t) * 0.55; });
  drips.forEach((o) => { o.t += dt * live; const f = o.t % 1.6; if (f < 1.2) { o.d.position.y = o.top; o.d.scale.setScalar(0.5 + (f / 1.2) * 0.6); } else { o.d.position.y = o.top - (f - 1.2) ** 2 * 18; o.d.scale.setScalar(1); } });
  rainGlassTex.offset.y = (t * 0.035) % 1;
  // notice board light box: steady with the odd stutter
  noticeMat.color.setScalar(Math.sin(t * 37) > 0.99 || t % 13 > 12.9 ? 0.72 : 0.9);
  // barricade lamps blink in a slow wave; arrow board runs right to left
  barricadeLamps.forEach((b) => b.m.material.color.setHex(Math.sin(t * 3 - b.phase) > 0 ? 0xff3020 : 0x3a0a08));
  const seq = Math.floor(t * 3) % 4;
  arrowCells.forEach((c, k) => c.children.forEach((d) => d.material.color.setHex(k < seq ? 0xffa21a : 0x2a1a08)));
  beacons.forEach((b) => { b.rotation.y += dt * 4 * live; });
  // office door: open for a few seconds now and then
  const dc = t % 17, open = dc > 11 && dc < 14 ? 1 : 0; doorA += (open - doorA) * Math.min(1, dt * 2.5);
  officeDoor.rotation.y = -doorA * 1.2;
  // crane: slew between the stacks and the shaft, lowering and raising the segment
  const cyc = (t * 0.06) % 1, swing = Math.sin(cyc * Math.PI * 2);
  cTop.rotation.y = -0.05 + swing * 0.35;
  cBoom.updateWorldMatrix(true, false); tip.copy(tipLocal).applyMatrix4(cBoom.matrixWorld);
  const drop = 2.4 + (1 - Math.abs(swing)) * 1.6 + Math.sin(t * 0.5) * 0.3;
  hookGroup.position.copy(tip);
  hookCable.scale.y = drop; hookCable.position.y = -drop / 2; hookBlock.position.y = -drop - 0.13;
  segment.position.y = -drop - 0.6; segment.rotation.set(Math.PI / 2, 0, Math.sin(t * 0.7) * 0.15);
  signals.forEach((s, i) => {
    const c = (t + i * 9) % 24, state = c < 10 ? 0 : c < 13 ? 1 : 2, cols = [0x2aff8a, 0xffc02a, 0xff3a3a];
    s.lamps.forEach((m, k) => m.material.color.setHex(k === state ? cols[k] : 0x151515));
    const go = state === 2 && c < 21; s.ped[0].material.color.setHex(go ? 0x3aa0ff : 0x0a1a2a); s.ped[1].material.color.setHex(go ? 0x2a0a0a : 0xff3a3a);
    s.lamps[state].getWorldPosition(s.halo.position); s.halo.material.color.setHex(cols[state]);
  });
  applySeasons(dt);
  if (controls.autoRotate) { // turn back at the edges so the notice stays in view
    const az = controls.getAzimuthalAngle();
    if (az > HOME_AZ + SWAY && controls.autoRotateSpeed < 0) controls.autoRotateSpeed = 0.25;
    if (az < HOME_AZ - SWAY && controls.autoRotateSpeed > 0) controls.autoRotateSpeed = -0.25;
  }
  controls.update();
  for (const b of bokeh) b.m.opacity = b.base * (0.7 + 0.3 * Math.sin(t * b.sp + b.ph));
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
