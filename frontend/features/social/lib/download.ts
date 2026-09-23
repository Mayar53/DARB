import { toBlob } from "html-to-image";

/** How the exported PNG reached the user. */
export type PngDelivery = "shared" | "downloaded";

/**
 * Render a node to a PNG blob.
 *
 * pixelRatio 1 → the PNG is exactly the format's declared dimensions
 * (e.g. 1080×1350 post, 1200×630 telegram), never scaled up.
 */
async function renderPngBlob(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, {
    pixelRatio: 1,
    cacheBust: true,
    // The template is self-contained (inline styles, local asset); skip font
    // embedding to avoid CORS delays — the exported text keeps the browser's
    // fallback for the Fraunces/Tajawal families if they can't be inlined.
    skipFonts: true,
  });
  if (!blob) throw new Error("Could not render the graphic");
  return blob;
}

/**
 * Export a rendered graphic node to a PNG and hand it to the user.
 *
 * On phones an `<a download>` only ever lands in Files/Downloads — it never
 * reaches the photo library, which is where people expect a saved image to go.
 * The share sheet is the one route iOS and Android both honour into
 * Photos/Gallery (via "Save Image"), so when the platform can share files we
 * use that; otherwise we fall back to a plain download (desktop).
 *
 * Returns which route was taken, so the caller can confirm accordingly.
 */
export async function downloadPng(node: HTMLElement, filename: string): Promise<PngDelivery> {
  const blob = await renderPngBlob(node);
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (error) {
      // Dismissing the sheet is a normal outcome, not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return "shared";
      // Anything else (e.g. the user gesture expired during rendering) falls
      // through to the download below rather than leaving the user stuck.
    }
  }

  // Blob URL rather than a base64 data URL: large data URLs are unreliable as
  // a download target, especially on iOS.
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Let the download start before the URL is revoked.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
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
