import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Static linktree. Tailwind is wired through PostCSS (postcss.config.cjs)
// rather than @astrojs/tailwind, because that integration peer-caps at
// Astro 5 and breaks a clean Astro 7 install.
//
// `site` is the public address this copy is served from. Netlify provides it
// at build time as URL (the deploy's primary URL), so each owner's deploy gets
// its own canonical + sitemap host automatically. Falls back to a neutral
// placeholder for local dev.
const site = process.env.URL || "https://example.netlify.app";

export default defineConfig({
  site,
  integrations: [
    // Sitemap for the linktree. Filter out the admin shell so only the public
    // page is advertised.
    sitemap({
      filter: (page) => !page.includes("/admin"),
    }),
  ],
});
