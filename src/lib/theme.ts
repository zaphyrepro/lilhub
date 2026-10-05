// Theme generator: turn one brand color into a full light + dark palette.
//
// The user picks a single brand color. From its hue we derive both a tinted
// near-white (light) palette and a tinted near-black (dark) palette, so the
// light/dark toggle keeps working and both modes feel like "their" color.
// The brand color itself is used as the accent (links, ring) in both modes.
//
// Output uses the shadcn HSL-triplet convention ("H S% L%") that global.css and
// tailwind.config.cjs already consume via hsl(var(--token)).

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace("#", "").trim();
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const t = (h: number, s: number, l: number) => `${h} ${s}% ${l}%`;

// Build the full token set for one mode from a hue, a base tint saturation, and
// the brand accent (kept identical across modes for a recognizable look).
function paletteFor(
  h: number,
  ramps: Record<string, [number, number]>,
  brand: string,
  brandForeground: string,
) {
  const out: Record<string, string> = {};
  for (const [token, [s, l]] of Object.entries(ramps)) out[token] = t(h, s, l);
  out.primary = brand;
  out["primary-foreground"] = brandForeground;
  out.ring = brand;
  return out;
}

export function generateTheme(primaryHex: string) {
  const { h, s, l } = hexToHsl(primaryHex);

  // Light mode: the brand color as-is (clamped so very muted picks still read,
  // and capped at L60 so it stays legible as an accent on a near-white card).
  const lightL = Math.min(Math.max(l, 38), 60);
  const lightBrand = t(h, Math.max(s, 35), lightL);
  const lightBrandFg = lightL > 62 ? t(h, 30, 14) : "0 0% 100%";
  // Dark mode: lift lightness so the accent stays visible on a dark canvas.
  const darkL = Math.min(Math.max(l, 58), 72);
  const darkBrand = t(h, Math.max(s, 45), darkL);
  const darkBrandFg = darkL > 64 ? t(h, 30, 12) : "0 0% 100%";

  const light = paletteFor(h, {
    background: [30, 99],
    foreground: [35, 12],
    muted: [25, 95],
    "muted-foreground": [15, 45],
    popover: [30, 100],
    "popover-foreground": [35, 12],
    card: [30, 100],
    "card-foreground": [35, 12],
    border: [25, 89],
    input: [25, 89],
    secondary: [30, 92],
    "secondary-foreground": [35, 25],
    accent: [35, 92],
    "accent-foreground": [35, 25],
  }, lightBrand, lightBrandFg);

  const dark = paletteFor(h, {
    background: [24, 9],
    foreground: [15, 93],
    muted: [22, 16],
    "muted-foreground": [12, 65],
    popover: [23, 12],
    "popover-foreground": [15, 93],
    card: [23, 11],
    "card-foreground": [15, 93],
    border: [20, 24],
    input: [20, 24],
    secondary: [20, 24],
    "secondary-foreground": [15, 93],
    accent: [45, 30],
    "accent-foreground": [15, 93],
  }, darkBrand, darkBrandFg);

  return { light, dark };
}

// Emit a CSS string that overrides global.css. Uses html:root / html.dark
// (specificity 0,1,1) so it wins over the base :root / .dark rules regardless
// of stylesheet order, and still switches correctly when .dark is toggled.
export function themeToCss(primaryHex: string): string {
  const { light, dark } = generateTheme(primaryHex);
  const vars = (o: Record<string, string>) =>
    Object.entries(o).map(([k, v]) => `--${k}:${v};`).join("");
  return `html:root{${vars(light)}}html.dark{${vars(dark)}}`;
}

// Same palette as themeToCss, but scoped to a selector instead of the whole
// document, so several themed sections can coexist on one page (e.g. the
// /example persona rotation). The light vars go on `${selector}` (specificity
// 0,1,0) and the dark vars on `.dark ${selector}` (0,2,0); because injectTheme
// is disabled on such a page there is no competing html:root override, the base
// global.css :root (0,1,0) loses on source order, and .dark (0,1,0) loses to
// .dark ${selector} (0,2,0). The custom properties then inherit to descendants
// (the LinkCards), which is what tints them to the persona's color.
export function themeToScopedCss(primaryHex: string, selector: string): string {
  const { light, dark } = generateTheme(primaryHex);
  const vars = (o: Record<string, string>) =>
    Object.entries(o).map(([k, v]) => `--${k}:${v};`).join("");
  return `${selector}{${vars(light)}}.dark ${selector}{${vars(dark)}}`;
}
