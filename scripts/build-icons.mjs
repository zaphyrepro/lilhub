// Generates src/data/icons.json from the canonical Lucide + Font Awesome
// sources. Lucide (stroke) for generic glyphs; every Font Awesome Free *brand*
// logo (fill) for platforms. Re-run after editing:  node scripts/build-icons.mjs
//
// The brand list is enumerated from the package's file index, so all FA Free
// brands are baked in (no runtime Font Awesome needed). Icon.astro resolves any
// name and falls back to "link" for unknowns.
import { writeFile, mkdir } from "node:fs/promises";

const FA_VER = "6.7.2";

// Generic UI glyphs -> Lucide (rendered as stroke, the lilAgents house standard).
const LUCIDE = [
  "globe", "mail", "calendar", "calendar-days", "link", "store", "map-pin",
  "phone", "file-text", "music", "newspaper", "image", "heart", "briefcase",
  "book-open", "shopping-bag", "video", "download", "external-link", "rss",
  "home", "user", "users", "message-circle", "send", "camera", "mic", "headphones",
  "shopping-cart", "credit-card", "gift", "star", "bookmark", "tag", "coffee",
  "pen-tool", "code", "terminal", "graduation-cap", "map", "navigation",
  "clock", "bell", "share-2", "hash", "at-sign", "play", "monitor", "smartphone",
  "wallet", "hand-heart", "sparkles", "zap", "flame", "trophy", "podcast",
];

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.text();
}

// Enumerate every FA Free brand icon name from the package's flat file list.
async function faBrandNames() {
  const r = await fetch(
    `https://data.jsdelivr.com/v1/package/npm/@fortawesome/fontawesome-free@${FA_VER}/flat`,
  );
  const j = await r.json();
  return j.files
    .map((f) => (f.name.match(/^\/svgs\/brands\/(.+)\.svg$/) || [])[1])
    .filter(Boolean)
    .sort();
}

const viewBoxOf = (svg) => (svg.match(/viewBox="([^"]+)"/i) || [, "0 0 24 24"])[1];
const inner = (svg) =>
  svg
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s+/g, " ")
    .trim();

const out = {};

// Lucide (parallel, small list)
await Promise.all(
  LUCIDE.map(async (n) => {
    try {
      const svg = await fetchText(`https://cdn.jsdelivr.net/npm/lucide-static/icons/${n}.svg`);
      out[n] = { mode: "stroke", viewBox: "0 0 24 24", body: inner(svg) };
    } catch (e) {
      console.error("lucide miss:", n, e.message);
    }
  }),
);

// Font Awesome Free brands (all of them, in polite chunks)
const brands = await faBrandNames();
for (let i = 0; i < brands.length; i += 24) {
  const chunk = brands.slice(i, i + 24);
  await Promise.all(
    chunk.map(async (n) => {
      try {
        const svg = await fetchText(
          `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@${FA_VER}/svgs/brands/${n}.svg`,
        );
        out[n] = { mode: "fill", viewBox: viewBoxOf(svg), body: inner(svg) };
      } catch (e) {
        console.error("fa-brand miss:", n, e.message);
      }
    }),
  );
}

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../src/data/icons.json", import.meta.url), JSON.stringify(out));
console.log("wrote", Object.keys(out).length, "icons");
