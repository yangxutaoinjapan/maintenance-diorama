// Maintenance gate (Cloudflare Worker).
//
// The Worker stays deployed on the public hostnames' routes. The MAINTENANCE
// variable is the switch: "on" serves the full-screen maintenance page (503 +
// Retry-After) to every request, whatever state the origin is in -- the page
// comes from the edge, so it stays up while servers, the gateway or the tunnel
// are down. Anything else (including unset) passes every request through to
// the origin untouched. Flip it in the Cloudflare dashboard or with
// `npm run on` / `npm run off`.
//
// Hosts listed in passHosts (for example operator consoles behind an access
// proxy, or machine endpoints) are passed through even while maintenance is on.
import CONFIG from "../dist/config.json";
import SCENE from "../dist/scene.bundle.txt";
import type { Config } from "./config";
import { renderPage } from "./render";

export interface Env {
  MAINTENANCE?: string; // "on" serves the maintenance page; anything else passes through
  MAINTENANCE_UNTIL?: string; // ISO time the window is expected to end
}

const config = CONFIG as Config;
const SCENE_PATH = "/__maintenance/scene.js";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if ((env.MAINTENANCE || "").trim().toLowerCase() !== "on") return fetch(req);
    const url = new URL(req.url);
    const host = url.hostname.toLowerCase();
    if (config.passHosts.map((h) => h.toLowerCase()).includes(host)) return fetch(req);
    if (url.pathname === SCENE_PATH) {
      return new Response(SCENE as string, {
        headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=3600" },
      });
    }

    const until = env.MAINTENANCE_UNTIL || config.until;
    const retry = until ? Math.max(60, Math.min(3600, Math.round((new Date(until).getTime() - Date.now()) / 1000))) : 600;
    const headers = {
      "retry-after": String(isNaN(retry) ? 600 : retry),
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "x-maintenance": "1",
    };
    const wantsJson = url.pathname.startsWith("/api/") || (req.headers.get("accept") || "").includes("application/json");
    if (wantsJson || req.method !== "GET") {
      return new Response(JSON.stringify({ error: "maintenance", retryAfter: Number(headers["retry-after"]) }), {
        status: 503,
        headers: { ...headers, "content-type": "application/json" },
      });
    }
    const html = renderPage({
      config,
      host,
      acceptLanguage: req.headers.get("accept-language") || "",
      lang: url.searchParams.get("lang"),
      until,
      sceneSrc: `${SCENE_PATH}?v=${(SCENE as string).length}`,
    });
    return new Response(html, { status: 503, headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
  },
};
