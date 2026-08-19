/**
 * Hugi User Invite & Share Utility
 * Creates clean, professional share templates and dynamic short links
 */

export function getCleanUserInviteLink(username: string): string {
  const clean = (username || "user").trim().toLowerCase().replace(/^@/, "");
  if (typeof window !== "undefined") {
    const host = window.location.host;
    const protocol = window.location.protocol || "https:";
    return `${protocol}//${host}/u/${clean}`;
  }
  return `https://hugi.app/u/${clean}`;
}

export function formatInviteMessage(user: { name?: string; username?: string }): string {
  const fullName = user.name || (user.username ? `@${user.username}` : "មិត្តភក្តិ");
  const username = user.username || "user";
  const link = getCleanUserInviteLink(username);

  return `✨ ${fullName} បានអញ្ជើញអ្នកមកលេង Hugi App!\n💬 ចុច Link ខាងក្រោមដើម្បីឆាត និងទាក់ទងជាមួយខ្ញុំ៖\n👉 ${link}`;
}

export async function shareUserInvite(user: { name?: string; username?: string }): Promise<"shared" | "copied" | "failed"> {
  const shareText = formatInviteMessage(user);
  const username = user.username || "user";
  const link = getCleanUserInviteLink(username);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `Hugi Chat - @${username}`,
        text: shareText,
        url: link,
      });
      return "shared";
    } catch {
      // User cancelled share dialog or unsupported, fallback to clipboard
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareText);
      return "copied";
    } catch {
      return "failed";
    }
  }

  return "failed";
}
