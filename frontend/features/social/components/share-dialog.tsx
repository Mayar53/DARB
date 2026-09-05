"use client";

import { Check, Copy, Download, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "radix-ui";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import type { MessageKey } from "@/lib/i18n";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/utils";

import { buildCaption } from "../lib/caption-builder";
import { copyText, downloadPng, shareContent } from "../lib/download";
import {
  SOCIAL_FORMATS,
  socialFileName,
  type SocialFormat,
  type SocialFormatKey,
} from "../lib/social-formats";
import { SocialGraphic } from "./social-graphic";

interface ShareDialogProps {
  opportunity: Opportunity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Build the i18n labels the graphic/caption need (reusing existing keys). */
function useSocialLabels() {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      modeOnline: t("home.modeOnline"),
      modeInPerson: t("home.modeInPerson"),
      modeHybrid: t("home.modeHybrid"),
      fundingFree: t("home.fundingFree"),
      fundingPaid: t("home.fundingPaid"),
      fundingFullyFunded: t("home.fundingFullyFunded"),
      fundingPartiallyFunded: t("home.fundingPartiallyFunded"),
      ageAll: t("home.ageAll"),
      certificateOffered: t("home.certificateOffered"),
    }),
    [t],
  );
}

const FORMAT_KEYS: readonly SocialFormatKey[] = [
  "post",
  "square",
  "story",
  "telegram",
  "general",
];

/**
 * Measure an element's content-box size via a callback ref + ResizeObserver.
 *
 * The callback ref fires whenever the node mounts (e.g. each time the Radix
 * dialog opens and its portal content is inserted), so the measured size is
 * always current even though ShareDialog itself stays mounted while closed.
 */
function useMeasure<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const attach = useCallback((node: T | null) => {
    // Drop the previous observer before re-attaching to a new/old node.
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    },
    [],
  );

  return { ref: attach, size };
}

export function ShareDialog({ opportunity, open, onOpenChange }: ShareDialogProps) {
  const { t, locale } = useTranslation();
  const labels = useSocialLabels();
  const [formatKey, setFormatKey] = useState<SocialFormatKey>("post");
  const graphicRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState<"caption" | "link" | null>(null);

  // Preview stage measured so the graphic scales to fit without cropping.
  const { ref: stageRef, size: stageSize } = useMeasure<HTMLDivElement>();

  const format: SocialFormat = SOCIAL_FORMATS.find((f) => f.key === formatKey) ?? SOCIAL_FORMATS[0];

  // Scale = min(fit width, fit height) — never distorts, never crops.
  // Until the stage is measured we render at native size inside a scrollable
  // stage, so a graphic is always visible (never a blank area).
  const PAD = 18;
  const hasStage = stageSize.width > 0 && stageSize.height > 0;
  const scale = useMemo(() => {
    if (!hasStage) return 1;
    const availW = Math.max(1, stageSize.width - PAD * 2);
    const availH = Math.max(1, stageSize.height - PAD * 2);
    return Math.min(availW / format.width, availH / format.height);
  }, [hasStage, stageSize.width, stageSize.height, format.width, format.height]);

  const previewW = format.width * scale;
  const previewH = format.height * scale;

  // Canonical share URL — the direct opportunity page, never the homepage.
  const directUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return `${origin}/opportunities/${opportunity.id}`;
  }, [opportunity.id]);

  const caption = useMemo(
    () => buildCaption(opportunity, locale, labels, directUrl),
    [opportunity, locale, labels, directUrl],
  );

  const handleDownload = useCallback(async () => {
    if (!graphicRef.current) return;
    try {
      await downloadPng(graphicRef.current, socialFileName(opportunity.id, formatKey));
      toast.success(t("share.downloaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("share.failed"));
    }
  }, [formatKey, opportunity.id, t]);

  const handleCopyCaption = useCallback(async () => {
    const ok = await copyText(caption);
    setCopied(ok ? "caption" : null);
    if (ok) toast.success(t("share.copiedCaption"));
    else toast.error(t("share.failed"));
  }, [caption, t]);

  const handleCopyLink = useCallback(async () => {
    const ok = await copyText(directUrl);
    setCopied(ok ? "link" : null);
    if (ok) toast.success(t("share.copiedLink"));
    else toast.error(t("share.failed"));
  }, [directUrl, t]);

  const handleShare = useCallback(async () => {
    const shared = await shareContent({
      title: opportunity.title,
      text: caption,
      url: directUrl,
    });
    if (!shared) {
      // Fallback: copy the link (reliable on every platform).
      const ok = await copyText(directUrl);
      if (ok) toast.success(t("share.copiedLink"));
      else toast.error(t("share.failed"));
    }
  }, [caption, directUrl, opportunity.title, t]);

  return (
    <Dialog.Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Dialog.Portal>
        <Dialog.Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 animate-in fade-in" />
        <Dialog.Dialog.Content className="fixed inset-0 z-50 flex max-h-dvh flex-col overflow-y-auto border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 sm:inset-x-4 sm:inset-y-6 sm:mx-auto sm:max-w-[86rem] sm:rounded-2xl lg:inset-x-6 lg:inset-y-6 lg:h-[min(94dvh,68rem)] lg:overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7">
            <div>
              <Dialog.Dialog.Title className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
                <Share2 className="size-5 text-primary" />
                {t("share.title")}
              </Dialog.Dialog.Title>
              <Dialog.Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {t("share.subtitle")}
              </Dialog.Dialog.Description>
            </div>
            <Dialog.Dialog.Close asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Close">
                <span aria-hidden className="text-lg leading-none">✕</span>
              </Button>
            </Dialog.Dialog.Close>
          </div>

          {/* Body: stacked on mobile, preview-left/controls-right on desktop */}
          <div className="flex flex-1 flex-col gap-4 p-5 sm:p-7 lg:min-h-0 lg:flex-row lg:gap-6">
            {/* Preview stage */}
            <div className="order-1 flex min-h-[42vh] flex-1 flex-col lg:order-none lg:min-h-0">
              <div
                ref={stageRef}
                className="flex flex-1 items-center justify-center overflow-auto rounded-2xl border border-border bg-muted/40 p-5 lg:overflow-hidden"
              >
                <div style={{ width: previewW, height: previewH }} dir="ltr">
                  <div
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                      width: format.width,
                      height: format.height,
                      overflow: "hidden",
                    }}
                  >
                    <div ref={graphicRef}>
                      <SocialGraphic
                        opp={opportunity}
                        format={format}
                        locale={locale}
                        labels={labels}
                        origin={directUrl.replace(`/opportunities/${opportunity.id}`, "")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="order-2 flex w-full shrink-0 flex-col gap-5 lg:order-none lg:w-80 lg:overflow-y-auto">
              {/* Format selector */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("share.chooseFormat")}
                </span>
                <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-1">
                  {FORMAT_KEYS.map((key) => {
                    const f = SOCIAL_FORMATS.find((x) => x.key === key) ?? SOCIAL_FORMATS[0];
                    const active = formatKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormatKey(key)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-start transition-colors",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-ring/40"
                            : "border-border bg-background hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground",
                          )}
                          style={{
                            width: 30,
                            height: f.width > f.height ? 20 : f.width < f.height ? 40 : 28,
                          }}
                        >
                          {f.width > f.height ? "▭" : f.width < f.height ? "▯" : "▢"}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-sm font-semibold",
                              active ? "text-primary" : "text-foreground",
                            )}
                          >
                            {t(f.labelKey as MessageKey)}
                          </span>
                          <span className="block text-xs text-muted-foreground" dir="ltr">
                            {f.width}×{f.height}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected format info */}
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2 font-semibold text-foreground">
                  <span>{t(format.labelKey as MessageKey)}</span>
                  <span className="text-muted-foreground" dir="ltr">
                    {format.width}×{format.height}px
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {format.width > format.height
                    ? t("share.landscapeHint")
                    : format.width < format.height
                      ? t("share.portraitHint")
                      : t("share.squareHint")}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
                <Button onClick={handleDownload} size="lg" className="w-full">
                  <Download className="size-4" />
                  {t("share.download")}
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={() => void handleCopyCaption()}>
                    {copied === "caption" ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                    {t("share.copyCaption")}
                  </Button>
                  <Button variant="outline" onClick={() => void handleCopyLink()}>
                    {copied === "link" ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                    {t("share.copyLink")}
                  </Button>
                  <Button variant="secondary" onClick={() => void handleShare()}>
                    <Share2 className="size-4" />
                    {t("share.share")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Dialog.Content>
      </Dialog.Dialog.Portal>
    </Dialog.Dialog.Root>
  );
}
