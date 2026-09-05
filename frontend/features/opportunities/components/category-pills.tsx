"use client";

import { CATEGORIES, categoryInfo } from "@/lib/constants";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

import { useOpportunitiesStore } from "../store/opportunities.store";

/** Multi-select category pills with colored dots — exact draft.js behaviour. */
export function CategoryPills() {
  const { t } = useTranslation();
  const activeCategories = useOpportunitiesStore((s) => s.activeCategories);
  const toggleCategory = useOpportunitiesStore((s) => s.toggleCategory);
  const clearCategories = useOpportunitiesStore((s) => s.clearCategories);

  const allActive = activeCategories.length === 0;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {t("home.browse")}
      </div>
      <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
        {t("home.categoriesTitle")}
      </h2>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={clearCategories}
          className={cn(
            "pill inline-flex items-center gap-[9px] rounded-[12px] border-[1.5px] px-[22px] py-[11px] text-[13.5px] font-semibold shadow-[0_3px_10px_rgba(14,71,73,0.06)]",
            allActive
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-primary hover:text-primary",
          )}
          style={{ "--cat-color": "var(--primary)" } as React.CSSProperties}
        >
          {t("home.all")}
        </button>

        {CATEGORIES.map((cat) => {
          const active = activeCategories.includes(cat.key);
          const color = categoryInfo(cat.key).color;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => toggleCategory(cat.key)}
              data-active={active}
              className={cn(
                "pill inline-flex items-center gap-[9px] rounded-[12px] border-[1.5px] px-[22px] py-[11px] text-[13.5px] font-semibold tracking-wide shadow-[0_3px_10px_rgba(14,71,73,0.06)] hover:-translate-y-0.5",
                "border-border bg-card text-muted-foreground",
              )}
              style={{ "--cat-color": color } as React.CSSProperties}
            >
              <span
                className="size-[9px] rounded-full transition-transform duration-200"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 0 3px ${color}33`,
                  transform: active ? "scale(1.15)" : undefined,
                }}
              />
              {t(cat.labelKey)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
