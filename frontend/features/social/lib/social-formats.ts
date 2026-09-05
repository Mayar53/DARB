/** Social graphic format presets (exact exported pixel dimensions). */
export type SocialFormatKey =
  | "post"
  | "square"
  | "story"
  | "telegram"
  | "general";

export interface SocialFormat {
  key: SocialFormatKey;
  /** Exact output width in px (also the natural render width). */
  width: number;
  /** Exact output height in px. */
  height: number;
  /** Show a QR code on this format. */
  showQr: boolean;
  /** i18n label key for the format name (e.g. "Instagram Post"). */
  labelKey: string;
}

export const SOCIAL_FORMATS: readonly SocialFormat[] = [
  { key: "post", width: 1080, height: 1350, showQr: false, labelKey: "share.formatPost" },
  { key: "square", width: 1080, height: 1080, showQr: false, labelKey: "share.formatSquare" },
  { key: "story", width: 1080, height: 1920, showQr: true, labelKey: "share.formatStory" },
  { key: "telegram", width: 1200, height: 630, showQr: false, labelKey: "share.formatTelegram" },
  // General website card: portrait 4:5 fits most site card grids & feeds.
  { key: "general", width: 1080, height: 1350, showQr: true, labelKey: "share.formatGeneral" },
] as const;

export function formatByKey(key: SocialFormatKey): SocialFormat {
  return SOCIAL_FORMATS.find((f) => f.key === key) ?? SOCIAL_FORMATS[0];
}

/** "Instagram Post · 1080×1350" — name + exact dimensions for the selector. */
export function formatLabel(format: SocialFormat, translatedName: string): string {
  return `${translatedName} · ${format.width}×${format.height}`;
}

/** Download filename for a generated graphic. */
export function socialFileName(id: number, key: SocialFormatKey): string {
  return `darb-opportunity-${id}-${key}.png`;
}
