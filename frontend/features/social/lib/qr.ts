import QRCode from "qrcode";

/**
 * Render a QR code to a data URL. The Darb teal is used for the dark modules;
 * the surrounding white card in the design provides the quiet zone.
 */
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 240,
    margin: 2,
    color: { dark: "#0E4749", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}
