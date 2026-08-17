/**
 * Profile QR Service for Hugi Chat
 */
export function generateProfileQR(username: string): string {
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
  return `https://hugi.app/@${cleanUsername}`;
}
