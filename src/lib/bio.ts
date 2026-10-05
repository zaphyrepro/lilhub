// Minimal, safe bio formatter. The bio is the owner's own content, but we still
// escape all HTML first (so raw HTML never renders) and then apply a small,
// controlled markdown subset: **bold**, *italic*, [text](url) for http(s)/mailto
// links, and newlines as line breaks. Only the tags we emit here can appear.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bioToHtml(src: string): string {
  let o = escapeHtml((src || "").trim());
  // [text](url) -> link (http/https/mailto only)
  o = o.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, text, url) =>
      `<a href="${url}" target="_blank" class="underline underline-offset-2 hover:text-primary">${text}</a>`,
  );
  // **bold** before *italic* so the double-stars aren't caught as italic
  o = o.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  o = o.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  o = o.replace(/\n/g, "<br>");
  return o;
}

// Plain-text version (markdown stripped) for the OG image and SEO meta.
export function bioToPlain(src: string): string {
  return (src || "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
