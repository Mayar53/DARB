import { toPng } from "html-to-image";

/**
 * Export a rendered graphic node to a PNG and trigger a download.
 * pixelRatio 1 → the PNG is exactly the format's declared dimensions
 * (e.g. 1080×1350 post, 1200×630 telegram), never scaled up.
 */
export async function downloadPng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 1,
    cacheBust: true,
    // The template is self-contained (inline styles, local asset); skip font
    // embedding to avoid CORS delays — the exported text keeps the browser's
    // fallback for the Fraunces/Tajawal families if they can't be inlined.
    skipFonts: true,
  });
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/** Copy text to the clipboard with a legacy fallback. Returns success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Web Share API when available; returns false when the platform can't share. */
export async function shareContent(data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      // AbortError = user cancelled — treat as handled (no fallback needed).
      if (error instanceof DOMException && error.name === "AbortError") return true;
      return false;
    }
  }
  return false;
}
