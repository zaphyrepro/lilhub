// Prebuild step: point the Sveltia CMS config at whoever deployed this copy.
//
// Netlify sets REPOSITORY_URL (the repo) and BRANCH (the branch being built) at
// build time. This rewrites the `repo:` and `branch:` lines in
// public/admin/config.yml so /admin saves to the deployer's own repo and the
// correct branch (handles repos whose default branch is "master", not "main").
// With no env (local dev), the committed values are left as-is and editing
// falls back to Sveltia's local backend.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "..", "public", "admin", "config.yml");

function parseSlug(repositoryUrl) {
  if (!repositoryUrl) return null;
  let s = repositoryUrl.trim().replace(/\.git$/i, "").replace(/\/$/, "");
  const ssh = s.match(/^git@[^:]+:(.+)$/i);
  if (ssh) s = ssh[1];
  else {
    const http = s.match(/^https?:\/\/[^/]+\/(.+)$/i);
    if (http) s = http[1];
  }
  const parts = s.split("/").filter(Boolean);
  return parts.length < 2 ? null : `${parts[0]}/${parts[1]}`;
}

async function main() {
  const slug = parseSlug(process.env.REPOSITORY_URL);
  const branch = (process.env.BRANCH || "").trim();
  const original = await readFile(CONFIG_PATH, "utf8");
  let updated = original;

  if (slug) {
    updated = updated.replace(/^(\s*repo:\s*).*$/m, `$1${slug}`);
    console.log(`[set-cms-repo] repo -> ${slug}`);
  } else {
    console.log("[set-cms-repo] REPOSITORY_URL unset; leaving repo as-is");
  }
  if (branch) {
    updated = updated.replace(/^(\s*branch:\s*).*$/m, `$1${branch}`);
    console.log(`[set-cms-repo] branch -> ${branch}`);
  }
  if (updated !== original) await writeFile(CONFIG_PATH, updated, "utf8");
}

main().catch((err) => {
  console.error("[set-cms-repo] Failed:", err);
  process.exit(1);
});
