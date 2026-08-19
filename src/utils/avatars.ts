/**
 * Real Human Stock Portraits from Unsplash
 * Crisp, authentic, high-resolution photographs of real people.
 * Zero cartoons, zero emojis, zero vector illustrations.
 */
export const REAL_HUMAN_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
];

/**
 * Returns a deterministic real human photo based on username/name/id seed
 */
export function getRealAvatar(seed: string = "user"): string {
  if (!seed) return REAL_HUMAN_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % REAL_HUMAN_AVATARS.length;
  return REAL_HUMAN_AVATARS[index];
}

/**
 * Validates and cleans avatar URL.
 * If the URL is a cartoon (e.g. dicebear / avataaars), replaces with a real human portrait.
 */
export function sanitizeAvatarUrl(url?: string, fallbackSeed?: string): string {
  if (!url || typeof url !== "string") {
    return getRealAvatar(fallbackSeed);
  }
  const lower = url.toLowerCase();
  if (lower.includes("dicebear") || lower.includes("avataaars") || lower.includes("bottts") || lower.includes("pixel-art") || lower.includes("lorelei")) {
    return getRealAvatar(fallbackSeed || url);
  }
  return url;
}
