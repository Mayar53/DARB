"use client";

import { useState } from "react";

import { SUBJECT_TREE } from "@/lib/constants";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

import { useOpportunitiesStore } from "../store/opportunities.store";

/** Subject filter — a small number of broad parent pills first; selecting one
 * reveals its subcategories. STEM is 3-level (stem → science → biology). */
export function SubjectPills() {
  const { t } = useTranslation();
  const activeSubjects = useOpportunitiesStore((s) => s.activeSubjects);
  const toggleSubject = useOpportunitiesStore((s) => s.toggleSubject);
  const clearSubjects = useOpportunitiesStore((s) => s.clearSubjects);
  // Which broad group is open (the visible parent pill).
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  // Which sub-parent's deeper list is expanded (e.g. "science" under STEM).
  const [openSub, setOpenSub] = useState<string | null>(null);

  const allActive = activeSubjects.length === 0;
  const active = (key: string) => activeSubjects.includes(key);

  const selectedGroup = SUBJECT_TREE.find((g) => g.key === openGroup);

  const handleOpenGroup = (key: string) => {
    // A group with no subcategories (e.g. "General") is a direct leaf —
    // clicking it toggles the filter instead of trying to expand.
    const group = SUBJECT_TREE.find((g) => g.key === key);
    if (group && group.children.length === 0) {
      toggleSubject(key);
      setOpenSub(null);
      return;
    }
    setOpenGroup((prev) => (prev === key ? null : key));
    setOpenSub(null);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {t("home.fieldsTitle")}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={clearSubjects}
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

        {/* Step 1: the broad parent pills (kept small). */}
        {SUBJECT_TREE.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => handleOpenGroup(group.key)}
            data-active={active(group.key)}
            aria-expanded={openGroup === group.key}
            className={cn(
              "pill inline-flex items-center gap-[9px] rounded-[12px] border-[1.5px] px-[22px] py-[11px] text-[13.5px] font-semibold tracking-wide shadow-[0_3px_10px_rgba(14,71,73,0.06)] hover:-translate-y-0.5",
              "border-border bg-card text-muted-foreground",
            )}
            style={{ "--cat-color": group.color } as React.CSSProperties}
          >
            <span
              className="size-[9px] rounded-full"
              style={{ backgroundColor: group.color }}
            />
            {t(group.labelKey)}
            <span
              className={cn(
                "text-[10px] font-bold transition-transform duration-200",
                openGroup === group.key && "rotate-180",
              )}
              aria-hidden
            >
              ▾
            </span>
          </button>
        ))}
      </div>

      {/* Step 2: the subcategories of the selected broad group. */}
      {selectedGroup && selectedGroup.children.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 rounded-[16px] border border-border bg-card/60 p-4">
          {selectedGroup.children.map((child) => {
            const hasDeeper = child.children && child.children.length > 0;
            // Toggle the sub-parent directly (e.g. "Science") or open its own
            // deeper list for STEM sub-parents.
            const childActive = active(child.key);
            return (
              <div key={child.key} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSubject(child.key)}
                    data-active={childActive}
                    className={cn(
                      "pill inline-flex items-center gap-[9px] rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold tracking-wide shadow-[0_3px_10px_rgba(14,71,73,0.06)] hover:-translate-y-0.5",
                      "border-border bg-card text-muted-foreground",
                    )}
                    style={{ "--cat-color": child.color } as React.CSSProperties}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: child.color }}
                    />
                    {t(child.labelKey)}
                  </button>

                  {hasDeeper && (
                    <button
                      type="button"
                      onClick={() => setOpenSub((prev) => (prev === child.key ? null : child.key))}
                      aria-expanded={openSub === child.key}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {t("admin.form.fieldsExpand")}
                      <span
                        className={cn(
                          "text-[9px] transition-transform",
                          openSub === child.key && "rotate-180",
                        )}
                        aria-hidden
                      >
                        ▾
                      </span>
                    </button>
                  )}
                </div>

                {/* Step 3: deeper sub-subcategories (e.g. science → biology). */}
                {hasDeeper && openSub === child.key && (
                  <div className="flex flex-wrap gap-2 border-s-2 border-dashed ps-4">
                    {child.children!.map((leaf) => (
                      <button
                        key={leaf.key}
                        type="button"
                        onClick={() => toggleSubject(leaf.key)}
                        data-active={active(leaf.key)}
                        className={cn(
                          "pill inline-flex items-center gap-[7px] rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-[0_2px_6px_rgba(14,71,73,0.05)] hover:-translate-y-0.5",
                          "border-border bg-card text-muted-foreground",
                        )}
                        style={{ "--cat-color": leaf.color } as React.CSSProperties}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: leaf.color }}
                        />
                        {t(leaf.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
