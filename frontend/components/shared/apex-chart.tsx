"use client";

import dynamic from "next/dynamic";
import type { Props as ReactApexChartProps } from "react-apexcharts";

// ApexCharts touches `window`, so it must never render on the server.
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Reuse the library's own prop types so the wrapper stays in sync.
export type ApexChartProps = Pick<
  ReactApexChartProps,
  "type" | "series" | "options" | "height" | "width"
>;

/** Single reusable chart wrapper — every chart in the app goes through this. */
export function ApexChart({ type, series, options, height = 320, width = "100%" }: ApexChartProps) {
  return (
    <ReactApexChart
      type={type}
      series={series}
      options={options}
      height={height}
      width={width}
    />
  );
}
