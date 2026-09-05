import { categoryInfo } from "@/lib/constants";
import type { Opportunity } from "@/lib/types";

import { buildGraphicData, formatDeadline, safeLocale, type SocialLabels } from "./social-data";

/** Category tag + platform tags for the caption, localized. */
export function buildHashtags(opp: Opportunity, locale: string, labels: SocialLabels): string {
  const loc = safeLocale(locale);
  const catKey = categoryInfo(opp.category).key;
  const categoryTag =
    loc === "ar"
      ? {
          volunteer: "تطوع",
          competition: "مسابقات",
          fellowship: "زمالات",
          scholarship: "منح_دراسية",
          program: "برامج",
          internship: "تدريب",
          course: "دورات",
          workshop: "ورش",
          session: "جلسات",
          conference: "مؤتمرات",
          grant: "منح",
          research: "بحث_علمي",
          exchange: "تبادل_ثقافي",
        }[catKey]
      : catKey;
  const base =
    loc === "ar"
      ? ["درب", "فرص", "شباب"]
      : ["Darb", "Opportunities", "Youth"];
  const tags = [categoryTag, ...base].filter(Boolean).map((s) => `#${s.replace(/\s+/g, "")}`);
  return tags.join(" ");
}

/**
 * Build a platform-ready caption from the opportunity. Only real data is
 * included — no invented facts, no empty placeholders, no null/undefined.
 */
export function buildCaption(
  opp: Opportunity,
  locale: string,
  labels: SocialLabels,
  origin: string,
): string {
  const loc = safeLocale(locale);
  const data = buildGraphicData(opp, locale, labels, origin);
  const intro =
    loc === "ar"
      ? "تبحث عن فرصة جديدة؟ التقديم مفتوح الآن!"
      : "Looking for a new opportunity? Applications are now open!";

  const lines: string[] = [];

  // Title line.
  lines.push(`${emojiFor(data.categoryKey)} ${data.title}`);

  // Intro.
  lines.push(intro);

  // Details — only real values.
  const details: string[] = [];
  if (data.modeLabel) details.push(`${modeEmoji(opp.mode)} ${data.modeLabel}`);
  if (data.duration) details.push(`⏳ ${loc === "ar" ? "المدة" : "Duration"}: ${data.duration}`);
  if (data.deadline)
    details.push(`📅 ${loc === "ar" ? "الموعد النهائي" : "Deadline"}: ${data.deadline}`);
  if (data.fundingDisplay)
    details.push(`💰 ${loc === "ar" ? "التمويل" : "Funding"}: ${data.fundingDisplay}`);
  if (details.length > 0) lines.push(details.join("\n"));

  // NGO (only if real).
  if (data.organizationName) {
    lines.push(loc === "ar" ? `بتنظيم ${data.organizationName}` : `Organized by ${data.organizationName}`);
  }

  // CTA + direct URL.
  lines.push(loc === "ar" ? "قدّم عبر درب:" : "Apply through Darb:");
  lines.push(data.directUrl);

  // Hashtags.
  lines.push(buildHashtags(opp, locale, labels));

  return lines.join("\n\n");
}

/** Category emoji used in the caption title line (matches platform conventions). */
function emojiFor(categoryKey: string): string {
  switch (categoryKey) {
    case "volunteer":
      return "🤝";
    case "competition":
      return "🏆";
    case "fellowship":
      return "🎓";
    case "internship":
      return "💼";
    case "course":
      return "📚";
    case "workshop":
      return "🛠️";
    case "session":
      return "🗣️";
    case "conference":
      return "🌐";
    default:
      return "✨";
  }
}

function modeEmoji(mode: string): string {
  switch (mode) {
    case "online":
      return "🌍";
    case "in-person":
      return "📍";
    case "hybrid":
      return "🔄";
    default:
      return "📍";
  }
}

export { formatDeadline };
