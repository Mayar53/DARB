"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Word-by-word reveal heading (GSAP). A lightweight, dependency-free stand-in
 * for reactbits-style text animations — see frontend AGENTS.md for installing
 * reactbits components via the shadcn registry.
 */
export function AnimatedHeading({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      gsap.from(".word", {
        y: 24,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.08,
      });
    },
    { scope: ref },
  );

  return (
    <h1 ref={ref} className={cn("flex flex-wrap gap-x-2", className)}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="word inline-block">
          {word}
        </span>
      ))}
    </h1>
  );
}
