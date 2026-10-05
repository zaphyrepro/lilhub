// Optional "verified" badge on a lilHub page.
//
// Provider-agnostic by design. It defaults to RealHandles, but nothing here is
// locked to it; it just soft-promotes it as the default.
//
// How the RealHandles badge stays honest (this is the important part):
//
//   A build-time "does this handle exist" check is NOT enough. Anyone could put
//   "realhandles": "mrbeast" in their profile.json, and if MrBeast has a real
//   RealHandles profile the badge would light up on an impersonator's page. So
//   this resolver never trusts existence alone. Instead:
//
//     1. The page emits a rel="me" link to the RealHandles profile (see
//        index.astro). That is the outbound half of a two-way binding.
//     2. RealHandles only marks THIS page as a confirmed account once it fetches
//        the page and finds that rel="me" backlink (the IndieWeb mutual link).
//     3. At runtime the badge asks RealHandles' public link-status API whether
//        this exact page URL is a confirmed account. The badge reveals ONLY when
//        the answer is yes, and it points at the profile the API returns.
//
//   The result: a spoofer can link OUT to any handle, but the badge never
//   appears unless that handle's owner has independently linked BACK to this
//   page. The check is per-visit and can't be faked by editing profile.json.
//
// profile.json shapes accepted:
//   "realhandles": "davidvkimball"                              // shorthand
//   "verified": "davidvkimball"                                 // shorthand
//   "verified": { "provider": "realhandles", "handle": "davidvkimball" }
//   "verified": { "provider": "keybase", "url": "https://keybase.io/you", "label": "Keybase" }

export interface VerifiedBadge {
  // The profile this badge points at, and the rel="me" backlink target.
  url: string;
  // Tooltip / aria label, e.g. "Verified on RealHandles".
  label: string;
  // RealHandles handle, when the provider is RealHandles.
  handle?: string;
  // When true, the badge must be confirmed at runtime against the RealHandles
  // link-status API before it is shown (the anti-spoof gate above). When false
  // (a generic provider), the page just links out and the visitor confirms
  // there; we make no live claim.
  live: boolean;
}

type VerifiedConfig =
  | string
  | { provider?: string; handle?: string; url?: string; label?: string }
  | undefined;

export function resolveVerified(profile: Record<string, unknown>): VerifiedBadge | null {
  const raw =
    (profile.verified as VerifiedConfig) ??
    (typeof profile.realhandles === "string"
      ? { provider: "realhandles", handle: profile.realhandles }
      : undefined);
  if (!raw) return null;

  const cfg = typeof raw === "string" ? { provider: "realhandles", handle: raw } : raw;
  const provider = (cfg.provider || "realhandles").toLowerCase();

  if (provider === "realhandles") {
    const handle = (cfg.handle || "").replace(/^@/, "").trim().toLowerCase();
    if (!handle) return null;
    return {
      url: `https://realhandles.com/${encodeURIComponent(handle)}`,
      label: "Verified on RealHandles",
      handle,
      live: true,
    };
  }

  // Any other provider: link out (the visitor verifies there). We make no live
  // claim, so it is shown as-is without the runtime gate.
  const url = (cfg.url || "").trim();
  if (!/^https?:\/\//.test(url)) return null;
  const label = cfg.label || provider.charAt(0).toUpperCase() + provider.slice(1);
  return { url, label: `Verified on ${label}`, live: false };
}
