"use client";

import { Mail, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CATEGORIES, ROUTES } from "@/lib/constants";
import { useTranslation } from "@/hooks/use-translation";
import { APP_NAME } from "@/lib/constants";

/** Public footer — brand, tagline, category links, credit. */
export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="border-t border-border bg-primary-dark text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5 font-heading text-2xl font-bold">
            <Image
              src="/favicondarb.png"
              alt="DARB logo"
              width={30}
              height={30}
              className="size-[30px] shrink-0 rounded-[10px] object-cover"
            />
            {APP_NAME}
          </div>
          <p className="mt-2 text-sm text-primary-foreground/70">{t("home.footerTagline")}</p>
          <Link
            href={ROUTES.adminApply}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/50 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-primary-dark sm:px-4"
          >
            {t("home.applyToTeam")}
          </Link>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider opacity-80">
            {t("home.categoriesTitle")}
          </h4>
          <ul className="mt-3 grid grid-cols-2 gap-1.5 text-sm text-primary-foreground/80">
            {CATEGORIES.map((cat) => (
              <li key={cat.key}>{t(cat.labelKey)}</li>
            ))}
          </ul>
        </div>

        <div className="sm:text-end">
          <h4 className="text-sm font-semibold uppercase tracking-wider opacity-80">
            {t("home.contactTitle")}
          </h4>
          <ul className="mt-3 flex flex-col items-start gap-2 text-sm text-primary-foreground/80 sm:items-end">
            <li>
              <a
                href="https://t.me/DARBcontact_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 transition-colors hover:text-white"
              >
                <Send size={14} className="shrink-0 opacity-80" />
                {t("home.contactTelegram")}: @DARBcontact_bot
              </a>
            </li>
            <li>
              <a
                href="mailto:Darbconttactt@gmail.com"
                className="inline-flex items-center gap-2 transition-colors hover:text-white"
                dir="ltr"
              >
                <Mail size={14} className="shrink-0 opacity-80" />
                Darbconttactt@gmail.com
              </a>
            </li>
          </ul>
        </div>

        <div className="sm:text-end">
          <h4 className="text-sm font-semibold uppercase tracking-wider opacity-80">
            {APP_NAME}
          </h4>
          <p className="mt-3 text-sm text-primary-foreground/70">
            © {year} {APP_NAME}. {t("home.footerRights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
