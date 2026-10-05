// Build-time Open Graph image generation.
//
// Each deployed lilHub is a static site on Netlify, so there is no runtime or
// edge function to draw share cards on demand. Instead we render the OG PNG at
// BUILD TIME via Astro static endpoints (src/pages/og.png.ts, og-home.png.ts):
// Satori turns a small JSX-like tree into an SVG, then @resvg/resvg-js
// rasterizes that SVG to a real 1200x630 PNG that ships in dist/.
//
// Fonts: Satori needs raw TTF/OTF bytes (it cannot read woff2), so the real
// Poppins TTFs live in src/lib/og-fonts/ and are read off disk here. That keeps
// the build offline and deterministic (no Google Fonts fetch on Netlify).

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { generateTheme } from "./theme";
import { bioToPlain } from "./bio";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// lilHub brand mark color (the favicon tile) and the canonical Poppins ink.
const LILHUB_BLUE = "#536ee5";

// --- Fonts -----------------------------------------------------------------

let fontCache: { name: string; data: Buffer; weight: 400 | 600; style: "normal" }[] | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  // Read from the source tree relative to the project root. import.meta.url is
  // unreliable here: Astro bundles this module into dist/.prerender/chunks/ at
  // build time and does not copy the TTFs alongside it. process.cwd() is the
  // project root during `astro build` (and on Netlify), so the fonts resolve.
  const fontDir = join(process.cwd(), "src", "lib", "og-fonts");
  const [r, s] = await Promise.all([
    readFile(join(fontDir, "Poppins-Regular.ttf")),
    readFile(join(fontDir, "Poppins-SemiBold.ttf")),
  ]);
  fontCache = [
    { name: "Poppins", data: r, weight: 400, style: "normal" },
    { name: "Poppins", data: s, weight: 600, style: "normal" },
  ];
  return fontCache;
}

// --- lilHub mark -----------------------------------------------------------
// Satori cannot draw the interlocking link glyph cleanly from CSS shapes, so we
// embed the real raster mark (public/apple-touch-icon.png: the #536ee5 rounded
// tile + white link glyph) as a data URI and render it as an <img> in both
// cards. Read once and cached for the build.

let markCache: string | null = null;

async function loadMarkDataUri() {
  if (markCache) return markCache;
  const filePath = join(process.cwd(), "public", "apple-touch-icon.png");
  const bytes = await readFile(filePath);
  markCache = `data:image/png;base64,${bytes.toString("base64")}`;
  return markCache;
}

// The lilHub mark image at a given square size, with the same rounded corners
// as the source tile so it reads as a clean badge at any scale.
function lilHubMark(uri: string, size: number) {
  return {
    type: "img",
    props: {
      src: uri,
      width: size,
      height: size,
      style: {
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
      },
    },
  };
}

// --- Color helpers ---------------------------------------------------------

// Pull the share card's palette straight from the owner's published-page theme
// tokens (generateTheme), so the card and the page render in identical colors
// instead of a separate clamped approximation.
export function ogPalette(primaryHex: string) {
  const { light } = generateTheme(primaryHex);
  // Tokens are shadcn "H S% L%" triplets; wrap them as hsl() for Satori.
  const hsl = (triplet: string) => `hsl(${triplet.split(" ").join(", ")})`;
  return {
    brand: hsl(light.primary), // accent bar + lilHub mark tile
    bg: hsl(light.background), // page background
    ink: hsl(light.foreground), // name + strong text (same as the page)
    muted: hsl(light["muted-foreground"]), // one-liner (same as the page bio)
    avatarRing: hsl(light.border), // soft avatar ring
    avatarFallbackText: hsl(light["primary-foreground"]),
  };
}

// --- Avatar handling -------------------------------------------------------

// Resolve the owner's avatar into a data URI that Satori can embed. The source
// may be a remote URL or a local path under public/ (e.g. /uploads/me.png).
// SVGs are intentionally rejected: Satori rasterizes raster <img> only, and an
// SVG avatar (like the placeholder) is better shown as a monogram anyway. On
// any failure we return null so the caller draws the monogram fallback.
async function loadAvatarDataUri(
  avatar: string | undefined,
): Promise<string | null> {
  if (!avatar) return null;
  const lower = avatar.split("?")[0].toLowerCase();
  if (lower.endsWith(".svg")) return null; // fall back to monogram

  try {
    let bytes: Buffer;
    let mime = "image/png";
    if (/^https?:\/\//i.test(avatar)) {
      const res = await fetch(avatar);
      if (!res.ok) return null;
      const ct = res.headers.get("content-type") ?? "";
      if (ct.startsWith("image/svg")) return null;
      bytes = Buffer.from(await res.arrayBuffer());
      if (ct.startsWith("image/")) mime = ct.split(";")[0];
      else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
      else if (lower.endsWith(".webp")) mime = "image/webp";
    } else {
      // Local file served from public/. Strip the leading slash and read it
      // from the project's public/ dir (cwd is the project root at build time).
      const rel = avatar.replace(/^\//, "");
      const filePath = join(process.cwd(), "public", rel);
      bytes = await readFile(filePath);
      if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
      else if (lower.endsWith(".webp")) mime = "image/webp";
      else if (lower.endsWith(".gif")) mime = "image/gif";
    }
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function initialOf(name: string): string {
  const ch = (name || "?").trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function brandingRow(palette: ReturnType<typeof ogPalette>, markUri: string) {
  return {
    type: "div",
    props: {
      style: { display: "flex", alignItems: "center", gap: 14 },
      children: [
        lilHubMark(markUri, 44),
        {
          type: "div",
          props: {
            style: { display: "flex", fontSize: 30, fontWeight: 600, color: palette.ink },
            children: "lilHub",
          },
        },
      ],
    },
  };
}

// --- Shared SVG -> PNG step ------------------------------------------------

async function svgToPng(svg: string): Promise<Buffer> {
  // Render at 2x the OG width so the avatar photo and text stay crisp. Social
  // scrapers and browsers downscale the larger PNG smoothly; a 1x (1200px)
  // render visibly softens raster avatars into a grainy look.
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_WIDTH * 2 },
  });
  return Buffer.from(resvg.render().asPng());
}

// --- PART A: per-user OG from profile.json ---------------------------------

export interface ProfileLike {
  name?: string;
  description?: string;
  avatar?: string;
  theme?: { primary?: string };
  // When false, the owner has turned lilHub branding off; the mark + wordmark
  // are omitted from their share card (same toggle that hides the footer).
  showAttribution?: boolean;
}

// Render the owner's branded share card: avatar circle, name in the brand
// color, one-liner below, a thin brand accent bar on the left, and the lilHub
// mark + wordmark in the corner. A local avatar is read from public/.
export async function renderProfileOg(
  profile: ProfileLike,
): Promise<Buffer> {
  const name = (profile.name || "Your Name").trim();
  const oneLiner = bioToPlain(profile.description || "");
  const primary = profile.theme?.primary || LILHUB_BLUE;
  const palette = ogPalette(primary);
  const fonts = await loadFonts();
  const markUri = await loadMarkDataUri();

  const avatarUri = await loadAvatarDataUri(profile.avatar);
  const avatarSize = 190;

  const avatarNode = avatarUri
    ? {
        type: "img",
        props: {
          src: avatarUri,
          width: avatarSize,
          height: avatarSize,
          style: {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            objectFit: "cover",
            border: `6px solid ${palette.avatarRing}`,
          },
        },
      }
    : {
        // Monogram fallback: brand-color circle with the name's initial.
        type: "div",
        props: {
          style: {
            display: "flex",
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            background: palette.brand,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 96,
            fontWeight: 600,
            color: palette.avatarFallbackText,
          },
          children: initialOf(name),
        },
      };

  const tree = {
    type: "div",
    props: {
      style: {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: "flex",
        fontFamily: "Poppins",
        background: palette.bg,
        position: "relative",
      },
      children: [
        // Thin brand accent bar down the left edge.
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: 14,
              height: OG_HEIGHT,
              background: palette.brand,
            },
          },
        },
        // Main content column.
        {
          type: "div",
          props: {
            style: {
              flex: 1,
              height: OG_HEIGHT,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 92px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", gap: 48 },
                  children: [
                    avatarNode,
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 72,
                                fontWeight: 600,
                                color: palette.ink,
                                lineHeight: 1.1,
                              },
                              children: name,
                            },
                          },
                          oneLiner
                            ? {
                                type: "div",
                                props: {
                                  style: {
                                    display: "flex",
                                    marginTop: 18,
                                    fontSize: 34,
                                    fontWeight: 400,
                                    color: palette.muted,
                                    lineHeight: 1.35,
                                  },
                                  // Keep the one-liner from running wild on long bios.
                                  children:
                                    oneLiner.length > 120
                                      ? oneLiner.slice(0, 117).trimEnd() + "..."
                                      : oneLiner,
                                },
                              }
                            : null,
                        ].filter(Boolean),
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Corner branding (top-right). Omitted when the owner turns lilHub
        // branding off (the same showAttribution toggle that hides the footer).
        profile.showAttribution === false
          ? null
          : {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  top: 48,
                  right: 56,
                  display: "flex",
                },
                children: brandingRow(palette, markUri),
              },
            },
      ].filter(Boolean),
    },
  };

  const svg = await satori(tree as any, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });
  return svgToPng(svg);
}

// --- PART B: product OG for lilhub.me itself -------------------------------

// The product card differs from the per-user one: no avatar, a centered lilHub
// mark + wordmark on a clean branded wash, and the product tagline. It is the
// share image for the marketing site (homepage + product pages).
export async function renderProductOg(): Promise<Buffer> {
  const palette = ogPalette(LILHUB_BLUE);
  const fonts = await loadFonts();
  const markUri = await loadMarkDataUri();
  const tagline = "Your own link in bio. Owned by you.";

  const tree = {
    type: "div",
    props: {
      style: {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Poppins",
        background: palette.bg,
        position: "relative",
      },
      children: [
        // Brand accent bar across the very top.
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: OG_WIDTH,
              height: 14,
              background: LILHUB_BLUE,
              display: "flex",
            },
          },
        },
        // Mark + wordmark, large and centered.
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: 28 },
            children: [
              lilHubMark(markUri, 108),
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: 104,
                    fontWeight: 600,
                    color: palette.ink,
                  },
                  children: "lilHub",
                },
              },
            ],
          },
        },
        // Tagline.
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              marginTop: 36,
              fontSize: 44,
              fontWeight: 400,
              color: palette.muted,
            },
            children: tagline,
          },
        },
      ],
    },
  };

  const svg = await satori(tree as any, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });
  return svgToPng(svg);
}
