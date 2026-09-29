// Shape of dist/config.json, written by scripts/configure.mjs from the
// operator's maintenance.config.json (service icons already resolved).

export interface Copy {
  label?: string; // shown in the language menu, e.g. "日本語"
  title: string;
  status: string;
  eyebrow: string;
  headline: string; // "\n" marks the intended line break
  body: string;
  etaLabel: string; // "{tz}" is replaced by timeZone.label
  soon: string;
  left: string;
  services: string;
  hint: string;
}

export interface Notice {
  title: string;
  subject: string; // "{brand}" is replaced per site
  lines: string[];
  eta: string; // "{end}" is replaced by the end time
  etaUnknown: string;
  owner: string;
  site: string;
  address?: string; // plate on the utility poles, e.g. "本町 3-2"
}

export interface Service {
  name: string;
  hex: string;
  path: string; // 24x24 SVG path
}

export interface Config {
  passHosts: string[];
  until: string;
  timeZone: { id: string; label: string };
  defaultLanguage: string;
  sites: { hosts: string[]; brand: string }[];
  copy: Record<string, Copy>;
  notice: Notice;
  services: Service[];
}
