"use client";

/**
 * Animated page background: three soft brand-colored orbs drifting slowly
 * behind the content + a faint dotted texture. Fixed, non-interactive, and
 * hidden when the user prefers reduced motion (the keyframes are gated too).
 */
export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-orb-a absolute -top-32 -start-32 size-[480px] rounded-full bg-primary/12 blur-[110px]" />
      <div className="bg-orb-b absolute top-1/3 -end-40 size-[420px] rounded-full bg-secondary/15 blur-[120px]" />
      <div className="bg-orb-c absolute -bottom-40 start-1/4 size-[460px] rounded-full bg-accent/10 blur-[120px]" />

      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
    </div>
  );
}
