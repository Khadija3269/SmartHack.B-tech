// Core lookup: turns an English UI string into another language.
// Exact matches first, then "${}" placeholder patterns, then a case-insensitive fallback.
const cache = new WeakMap();

const norm = (s) => s.replace(/\s+/g, " ").trim();
const esc = (s) => s.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");

function build(dict) {
  const exact = new Map();
  const lower = new Map();
  const patterns = [];
  for (const [k, v] of Object.entries(dict)) {
    const key = norm(k);
    if (key.includes("${}")) {
      const parts = key.split("${}");
      const src = "^" + parts.map(esc).join("(.*?)") + "$";
      patterns.push({ re: new RegExp(src, "s"), out: v, weight: key.replace(/\$\{\}/g, "").length });
    } else {
      exact.set(key, v);
      if (!lower.has(key.toLowerCase())) lower.set(key.toLowerCase(), v);
    }
  }
  patterns.sort((a, b) => b.weight - a.weight);
  return { exact, lower, patterns };
}

function lookup(idx, core, depth = 0) {
  const hit = idx.exact.get(core);
  if (hit != null) return hit;
  for (const p of idx.patterns) {
    const m = core.match(p.re);
    if (m) {
      // arguments (titles, names, dates…) are translated too when they are known phrases
      return p.out.replace(/\{(\d+)\}/g, (_, i) => {
        const arg = m[Number(i) + 1] ?? "";
        return (depth < 2 && lookup(idx, norm(arg), depth + 1)) || arg;
      });
    }
  }
  const low = idx.lower.get(core.toLowerCase());
  return low != null ? low : null;
}

/** Returns the translation (keeping surrounding whitespace) or null when unknown. */
export function translateWith(dict, text) {
  if (!dict || typeof text !== "string") return null;
  let idx = cache.get(dict);
  if (!idx) { idx = build(dict); cache.set(dict, idx); }
  const core = norm(text);
  if (!core) return null;
  const out = lookup(idx, core);
  if (out == null) return null;
  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  return lead + out + trail;
}
