"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "@/hooks/use-translation";

const FAQ_ITEMS = [
  { q: "faq.1q", a: "faq.1a" },
  { q: "faq.2q", a: "faq.2a" },
  { q: "faq.3q", a: "faq.3a" },
  { q: "faq.4q", a: "faq.4a" },
  { q: "faq.5q", a: "faq.5a" },
  { q: "faq.6q", a: "faq.6a" },
  { q: "faq.7q", a: "faq.7a" },
] as const;

/** FAQ accordion — the "problem / solution / how it works" content. */
export function FaqAccordion() {
  const { t } = useTranslation();

  return (
    <section id="about" className="border-t border-border bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-heading text-3xl font-bold text-foreground">
          {t("home.faqTitle")}
        </h2>
        <p className="mt-2 text-center text-muted-foreground">{t("home.faq.subtitle")}</p>

        <Accordion type="single" collapsible className="mt-8 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.q}
              value={item.q}
              className="rounded-xl border border-border bg-card px-5"
            >
              <AccordionTrigger className="text-start text-base font-semibold">
                {t(item.q)}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {t(item.a)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
