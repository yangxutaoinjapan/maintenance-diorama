// Renders the maintenance page for one request. Pure: the Worker and the
// local preview (scripts/preview.mjs) both call it, so the preview is the page.
import PAGE from "./page.html";
import type { Config, Copy } from "./config";

export function hostMatches(host: string, pattern: string): boolean {
  return pattern.startsWith("*.") ? host.endsWith(pattern.slice(1)) : host === pattern;
}

// Language: an explicit ?lang= wins, then Accept-Language (exact tag, then its
// base: "zh-TW" before "zh"), then the configured default. Case-insensitive.
export function pickLang(config: Config, acceptLanguage: string, explicit?: string | null): string {
  const byLower = new Map(Object.keys(config.copy).map((k) => [k.toLowerCase(), k]));
  const find = (tag: string) => byLower.get(tag) ?? byLower.get(tag.split("-")[0]);
  if (explicit) { const hit = find(explicit.toLowerCase()); if (hit) return hit; }
  for (const part of acceptLanguage.toLowerCase().split(",")) {
    const tag = part.trim().split(";")[0];
    // Traditional-script Chinese tags without a region still mean zh-TW
    const hit = byLower.get(tag) ?? (tag === "zh-hant" || tag === "zh-hk" || tag === "zh-mo" ? byLower.get("zh-tw") : undefined) ?? find(tag);
    if (hit) return hit;
  }
  return config.copy[config.defaultLanguage] ? config.defaultLanguage : Object.keys(config.copy)[0];
}

// Calendar parts of an instant in the configured time zone.
function zoned(iso: string, timeZone: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, month: "numeric", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d).map((p) => [p.type, p.value]),
  );
  const m = Number(parts.month), day = Number(parts.day);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { m, day, wd, hm: `${Number(parts.hour)}:${parts.minute}` };
}

// 9月29日（火）18:00 -- how a Japanese site notice writes an end time
function noticeDate(iso: string, timeZone: string): string | null {
  const p = zoned(iso, timeZone);
  return p && `${p.m}月${p.day}日（${"日月火水木金土"[p.wd]}）${p.hm}`;
}

function pageDate(iso: string, timeZone: string, lang: string): string | null {
  const p = zoned(iso, timeZone);
  if (!p) return null;
  const base = lang.split("-")[0];
  if (base === "ja") return `${p.m}月${p.day}日（${"日月火水木金土"[p.wd]}）${p.hm}`;
  if (base === "zh") return `${p.m}月${p.day}日 ${p.hm}`;
  if (base === "ko") return `${p.m}월 ${p.day}일 ${p.hm}`;
  if (base === "en") return `${"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ")[p.m - 1]} ${p.day}, ${p.hm}`;
  return new Intl.DateTimeFormat(lang, { timeZone, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export interface RenderInput {
  config: Config;
  host: string;
  acceptLanguage: string;
  lang?: string | null; // ?lang= from the URL
  until?: string; // overrides config.until (Worker variable MAINTENANCE_UNTIL)
  sceneSrc: string;
}

export function renderPage({ config, host, acceptLanguage, lang: explicit, until, sceneSrc }: RenderInput): string {
  const site = config.sites.find((s) => s.hosts.some((p) => hostMatches(host, p))) ?? config.sites[0];
  const brand = site.brand;
  const lang = pickLang(config, acceptLanguage, explicit);
  const c: Copy = config.copy[lang];
  const end = until || config.until;
  const tz = config.timeZone;
  const endText = end ? pageDate(end, tz.id, lang) : null;
  const noticeEnd = end ? noticeDate(end, tz.id) : null;
  const b = (s: string) => s.replaceAll("{brand}", brand);
  const n = config.notice;
  const data = {
    timeZone: tz.id,
    services: config.services,
    notice: {
      title: n.title,
      subject: b(n.subject),
      lines: n.lines.map(b),
      eta: noticeEnd ? b(n.eta).replaceAll("{end}", noticeEnd) : b(n.etaUnknown),
      owner: b(n.owner),
      plate: brand,
      site: b(n.site),
      address: n.address || "本町 3-2",
    },
  };
  const vars: Record<string, string> = {
    LANG: esc(lang),
    UNTIL_ISO: esc(endText ? end : ""),
    TITLE: esc(`${c.title} — ${brand}`),
    WORDMARK: esc(brand),
    STATUS: esc(c.status),
    EYEBROW: esc(c.eyebrow),
    HEADLINE: esc(c.headline),
    BODY: esc(c.body),
    ETA_LABEL: esc(c.etaLabel.replaceAll("{tz}", tz.label)),
    ETA_VALUE: esc(endText || c.soon),
    LEFT_LABEL: esc(c.left),
    SERVICES: esc(c.services),
    HINT: esc(c.hint),
    TZ_LABEL: esc(tz.label),
    SCENE_SRC: esc(sceneSrc),
    LANG_LABEL: esc(c.label || lang),
    LANG_LINKS: Object.entries(config.copy).map(([code, x]) =>
      `<li><a href="?lang=${esc(encodeURIComponent(code))}" hreflang="${esc(code)}" lang="${esc(code)}"${code === lang ? ' aria-current="true"' : ""}>${esc(x.label || code)}</a></li>`).join(""),
    DATA_JSON: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
  return (PAGE as string).replace(/\{\{([A-Z_]+)\}\}/g, (m, k: string) => vars[k] ?? m);
}
