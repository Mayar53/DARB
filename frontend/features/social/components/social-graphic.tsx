"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { APP_NAME } from "@/lib/constants";
import type { Opportunity } from "@/lib/types";

import type { SocialFormat } from "../lib/social-formats";
import { buildGraphicData, safeLocale, type GraphicData, type SocialLabels } from "../lib/social-data";
import { qrDataUrl } from "../lib/qr";

const BRAND = {
  teal: "#0E4749",
  tealDark: "#092F30",
  gold: "#D4A24E",
  terracotta: "#C0533D",
  cream: "#F7F3EC",
  ink: "#1A1A1A",
  muted: "#5C5C5C",
  white: "#FFFFFF",
  border: "#E3DED2",
} as const;

/** CTA text per locale. */
const CTA: Record<"ar" | "en", string> = {
  ar: "اكتشف وقدّم عبر درب",
  en: "DISCOVER & APPLY ON DARB",
};

type Shape = "landscape" | "portrait" | "square";

function shapeOf(format: SocialFormat): Shape {
  if (format.width > format.height) return "landscape";
  if (format.width < format.height) return "portrait";
  return "square";
}

/**
 * A title font size that keeps the title readable AND inside its box:
 * the longer the title, the smaller the base size, then line-clamp protects
 * the remaining space. Sizes are per-shape (landscape has less height).
 */
function titleFontSize(shape: Shape, length: number): number {
  const long = length > 34;
  const veryLong = length > 62;
  switch (shape) {
    case "landscape":
      return veryLong ? 30 : long ? 38 : 48;
    case "square":
      return veryLong ? 40 : long ? 50 : 62;
    case "portrait":
    default:
      return veryLong ? 44 : long ? 56 : 70;
  }
}

/** How many title lines we allow before clamping (keeps layout intact). */
function titleClamp(shape: Shape): number {
  return shape === "landscape" ? 2 : 3;
}

function MetaRow({
  icon,
  text,
  fontSize,
  color = BRAND.ink,
}: {
  icon: string;
  text: string;
  fontSize: number;
  color?: string;
}) {
  if (!text) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: fontSize * 0.45 }}>
      <span style={{ fontSize: fontSize * 1.05, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize, fontWeight: 600, color, lineHeight: 1.3 }}>{text}</span>
    </div>
  );
}

/**
 * The branded Darb social graphic. Rendered with ONLY inline styles so the
 * html-to-image export is pixel-exact and independent of the app's CSS.
 *
 * Every format has its own composition (portrait / square / tall / landscape)
 * but the same visual hierarchy: logo → category → title → key facts →
 * funding + NGO + CTA (+ QR when the format supports it). The description is
 * deliberately never placed on the graphic.
 */
export function SocialGraphic({
  opp,
  format,
  locale,
  labels,
  origin,
}: {
  opp: Opportunity;
  format: SocialFormat;
  locale: string;
  labels: SocialLabels;
  origin: string;
}) {
  const loc = safeLocale(locale);
  // Landscape formats (telegram / general website card, 1200×630) have little
  // vertical room — keep the excerpt a tight teaser so it never overflows.
  const shape = shapeOf(format);
  const horizontal = shape === "landscape";
  const data: GraphicData = buildGraphicData(opp, locale, labels, origin, horizontal ? 110 : 140);
  const [qr, setQr] = useState<string | null>(null);

  // Optional NGO website favicon/logo is NOT available as an image asset;
  // the existing design uses the text name only, so we keep that. No empty box.
  const hasNgo = Boolean(data.organizationName);

  useEffect(() => {
    if (!format.showQr) return;
    let cancelled = false;
    qrDataUrl(data.directUrl)
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [format.showQr, data.directUrl]);

  const fit = useMemo(() => {
    const titleSize = titleFontSize(shape, data.title.length);
    const clamp = titleClamp(shape);
    const meta = shape === "landscape" ? 24 : shape === "portrait" ? 30 : 26;
    const chip = shape === "landscape" ? 18 : shape === "portrait" ? 24 : 22;
    const excerptSize = shape === "landscape" ? 22 : shape === "portrait" ? 26 : 24;
    const excerptClamp = shape === "landscape" ? 2 : 3;
    return { titleSize, clamp, meta, chip, excerptSize, excerptClamp };
  }, [shape, data.title.length]);

  // Padding + gaps scale with the canvas so the layout breathes on every size.
  const pad = horizontal ? 56 : 72;
  const brandLogo = horizontal ? 44 : 56;
  const brandText = horizontal ? 30 : 38;
  const footerText = horizontal ? 20 : 24;

  // Primary fact rows (location · mode · deadline) — short and scannable.
  const factRows: { icon: string; text: string }[] = [
    data.location ? { icon: "📍", text: data.location } : { icon: "", text: "" },
    data.modeLabel ? { icon: modeIcon(opp.mode), text: data.modeLabel } : { icon: "", text: "" },
    data.deadline ? { icon: "📅", text: data.deadline } : { icon: "", text: "" },
  ].filter((r) => r.text);

  // Extra card-detail chips (duration · age · certificate) — only real values.
  // Kept off the tight landscape formats so the promo stays balanced.
  const detailChips: string[] = horizontal
    ? []
    : ([
        data.duration,
        data.ageDisplay,
        data.certificate ? labels.certificateOffered : "",
      ].filter(Boolean) as string[]);

  const fundingChipSize = horizontal ? 18 : 24;

  return (
    <div
      data-darb-graphic
      style={{
        position: "relative",
        width: format.width,
        height: format.height,
        overflow: "hidden",
        background: BRAND.cream,
        color: BRAND.ink,
        fontFamily: "'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif",
        direction: "ltr",
        display: "flex",
        flexDirection: "column",
        padding: pad,
        boxSizing: "border-box",
        boxShadow: "inset 0 0 0 1px rgba(14,71,73,0.08)",
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          position: "absolute",
          insetInlineStart: 0,
          top: 0,
          width: horizontal ? 14 : 18,
          height: "100%",
          background: `linear-gradient(180deg, ${BRAND.teal}, ${BRAND.gold})`,
        }}
      />

      {/* Top: brand bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Image
          src="/favicondarb.png"
          alt="DARB logo"
          width={brandLogo}
          height={brandLogo}
          style={{
            width: brandLogo,
            height: brandLogo,
            borderRadius: brandLogo * 0.28,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'Fraunces', 'Tajawal', serif",
            fontSize: brandText,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: BRAND.teal,
          }}
        >
          {APP_NAME}
        </span>
      </div>

      {/* Middle: flexible content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: horizontal ? "center" : "flex-start",
          gap: horizontal ? 22 : 30,
          paddingTop: horizontal ? 24 : 48,
          minHeight: 0,
        }}
      >
        {/* Category chip */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            padding: `${chipPad(fit.chip)}px ${chipPad(fit.chip) * 2.4}px`,
            borderRadius: 999,
            background: data.categoryColor,
            color: BRAND.white,
            fontSize: fit.chip,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {data.categoryLabel}
        </div>

        {/* Title — wraps, line-clamped, never overflows */}
        <div
          style={{
            fontFamily: "'Fraunces', 'Tajawal', serif",
            fontSize: fit.titleSize,
            lineHeight: 1.12,
            fontWeight: 700,
            color: BRAND.ink,
            maxWidth: horizontal ? "92%" : "100%",
            display: "-webkit-box",
            WebkitLineClamp: fit.clamp,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "normal",
            wordBreak: "break-word",
          }}
        >
          {data.title}
        </div>

        {/* Short description excerpt — a teaser, never the full text */}
        {data.excerpt && (
          <div
            style={{
              fontSize: fit.excerptSize,
              lineHeight: 1.5,
              color: BRAND.muted,
              maxWidth: horizontal ? "92%" : "100%",
              display: "-webkit-box",
              WebkitLineClamp: fit.excerptClamp,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {data.excerpt}
          </div>
        )}

        {/* Extra card-detail chips (duration · age · certificate) */}
        {detailChips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: horizontal ? 10 : 14 }}>
            {detailChips.map((chip) => (
              <span
                key={chip}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: `${chipPad(fit.chip) * 0.7}px ${chipPad(fit.chip) * 1.8}px`,
                  borderRadius: 999,
                  border: `1px solid ${BRAND.border}`,
                  background: "rgba(255,255,255,0.5)",
                  color: BRAND.ink,
                  fontSize: fit.chip * 0.85,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Key facts (location · mode · deadline) — short, scannable */}
        {factRows.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: horizontal ? 12 : 18,
            }}
          >
            {factRows.map((row, i) => (
              <MetaRow key={i} icon={row.icon} text={row.text} fontSize={fit.meta} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom: funding, NGO, CTA, QR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          paddingTop: horizontal ? 18 : 28,
          borderTop: `1px solid ${BRAND.border}`,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: horizontal ? 12 : 18,
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* Funding chip — FREE or PAID + price */}
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              padding: `${chipPad(fundingChipSize) * 0.8}px ${chipPad(fundingChipSize) * 2}px`,
              borderRadius: 999,
              background: data.paid ? BRAND.terracotta : BRAND.teal,
              color: BRAND.white,
              fontSize: fundingChipSize,
              fontWeight: 800,
              letterSpacing: "0.03em",
              maxWidth: "100%",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {data.fundingDisplay}
            </span>
          </div>

          {/* NGO + CTA line — NGO optional, naturally reflows when absent */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              fontSize: footerText,
              fontWeight: 700,
              color: BRAND.teal,
              letterSpacing: "0.02em",
            }}
          >
            {hasNgo && (
              <span
                style={{
                  color: BRAND.muted,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: horizontal ? "50%" : "100%",
                }}
              >
                {data.organizationName}
              </span>
            )}
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {CTA[loc]}
            </span>
          </div>
        </div>

        {/* QR (story + general) — only when the format wants one */}
        {format.showQr && qr && (
          <div
            style={{
              flexShrink: 0,
              background: BRAND.white,
              borderRadius: horizontal ? 14 : 18,
              padding: horizontal ? 8 : 10,
              boxShadow: "0 4px 16px rgba(14,71,73,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR"
              width={horizontal ? 110 : 160}
              height={horizontal ? 110 : 160}
              style={{ display: "block", borderRadius: 8 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function chipPad(fontSize: number): number {
  return Math.max(6, Math.round(fontSize * 0.45));
}

function modeIcon(mode: string): string {
  switch (mode) {
    case "online":
      return "🌍";
    case "hybrid":
      return "🔄";
    default:
      return "📍";
  }
}
