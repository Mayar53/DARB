/**
 * Minimal ambient types for `qrcode` (the runtime package is installed).
 * The full @types/qrcode package fails to install reliably in this project,
 * so only the API surface used by features/social is declared here.
 */
declare module "qrcode" {
  export interface QRCodeToDataURLOptions {
    /** Width of the output image in px. */
    width?: number;
    /** Quiet zone size (modules). */
    margin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    color?: {
      dark?: string;
      light?: string;
    };
  }

  /** Render a QR code to a data URL (PNG). */
  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;
}
