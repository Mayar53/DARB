import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Tajawal } from "next/font/google";

import "./globals.css";
import { AnimatedBackground } from "@/components/shared/animated-background";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { AppProviders } from "@/providers/app-providers";

// Modern Arabic-first sans (covers Arabic + Latin). Maps to Tailwind's font-sans.
const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700", "800"], variable: "--font-sans" });
// Brand display serif (draft.css --font-display). Maps to Tailwind's font-heading.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-heading" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "DARB|درب — Iraqi Youth Opportunities",
  description:
    "DARB|درب helps Iraqi youth discover and apply to opportunities — volunteering, competitions, fellowships, internships, courses, workshops, sessions and conferences.",
  icons: {
    icon: "/favicondarb.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // dir/lang are the SSR defaults; AppProviders keeps them in sync after toggle.
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={cn("h-full", tajawal.variable, fraunces.variable, geistMono.variable)}
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <AnimatedBackground />
        <AppProviders>{children}</AppProviders>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
