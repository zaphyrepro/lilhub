import type { APIRoute } from "astro";
import profile from "../content/profile.json";
import { renderProfileOg } from "../lib/og";

// Per-user Open Graph share image, built at build time from profile.json. On a
// real deploy that file holds the owner's data, so this becomes their branded
// social card (avatar, name, one-liner, subtly themed by their brand color).
// Emitted as /og.png because this is a static build (no runtime endpoint).
export const prerender = true;

export const GET: APIRoute = async () => {
  // Local avatars (e.g. /uploads/me.png) referenced by profile.json are read
  // from public/ inside the renderer.
  const png = await renderProfileOg(profile);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
