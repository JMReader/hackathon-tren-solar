import { cn } from "@/lib/utils";
import { BRAND } from "../content";

/** Pixel mark: a sun setting over the horizon, with a rail line below. */
const ROWS = ["..###..", ".#####.", "#######", ".......", "#######", ".......", ".#####."];
const PIXELS = ROWS.flatMap((row, y) => [...row].flatMap((c, x) => (c === "#" ? [[x, y] as const] : [])));

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 7" className={cn("size-4", className)} aria-hidden shapeRendering="crispEdges">
      {PIXELS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium tracking-[0.04em] text-lp-fg uppercase", className)}>
      <LogoMark />
      {BRAND.name}
    </span>
  );
}
