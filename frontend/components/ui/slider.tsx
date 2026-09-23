"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * A slider built on Radix's Slider primitive.
 *
 * One thumb is rendered per value, so `value={[min, max]}` gives the
 * dual-handle range control and `value={[x]}` gives a single handle. Radix
 * supplies the keyboard model (arrows, Home/End, one thumb at a time), the
 * drag/click handling and the ARIA slider semantics; this wrapper only adds the
 * visual language and an accessible name per thumb.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** Accessible name per thumb — a slider thumb without one announces nothing. */
  thumbLabels?: string[]
}) {
  const values = React.useMemo(
    () =>
      Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none py-2 data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted"
      >
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          data-slot="slider-thumb"
          aria-label={thumbLabels?.[index]}
          className="block size-5 shrink-0 rounded-full border-2 border-primary bg-card shadow-[0_2px_8px_rgba(14,71,73,0.18)] transition-shadow duration-150 hover:ring-4 hover:ring-primary/15 focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
