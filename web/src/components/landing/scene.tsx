import { useId } from "react";
import { cn } from "@/lib/utils";

export type SceneVariant = "dusk" | "day" | "night";

const PALETTES: Record<
  SceneVariant,
  { sky: string[]; moon: string; cloud: string[]; far: string; haze: string; ground: string[]; strata: string[] }
> = {
  dusk: {
    sky: ["#4f7fa6", "#86a9c0", "#d7c0ad", "#f3b088"],
    moon: "#e8eef0",
    cloud: ["#ffd8bb", "#f6a987", "#fbe9dc"],
    far: "#7f8fae",
    haze: "#f6c7a5",
    ground: ["#9a8f45", "#5d5a24", "#2a2911"],
    strata: ["#b9553c", "#d98d4f", "#e7c48f", "#8e9c5d", "#9c6b8e", "#c76f4b", "#e3a873", "#6f8a6a"],
  },
  day: {
    sky: ["#3f86c4", "#7fb3d9", "#c8dbe3", "#efd9b9"],
    moon: "#ffffff",
    cloud: ["#ffffff", "#e6eef4", "#fbf5ec"],
    far: "#8aa3c2",
    haze: "#e9dcc4",
    ground: ["#a49a4c", "#6b6a2c", "#2c2c12"],
    strata: ["#c25f42", "#e19a58", "#f0cf98", "#97a663", "#a77598", "#d17b52", "#ebb57e", "#7a9673"],
  },
  night: {
    sky: ["#0d1630", "#24335c", "#5b5378", "#b27a6e"],
    moon: "#f4efe2",
    cloud: ["#8a7c99", "#5c5577", "#c8a7a0"],
    far: "#3c4566",
    haze: "#9b7b86",
    ground: ["#4c4a2a", "#2b2a17", "#11110a"],
    strata: ["#7c3b33", "#93603f", "#a58a68", "#5d6a48", "#6b4a66", "#87503c", "#9c7658", "#4d6150"],
  },
};

function Cardon({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <rect x="-9" y="-120" width="18" height="120" rx="9" />
      <path d="M-9 -58 h-14 a8 8 0 0 1 -8 -8 v-30 a7 7 0 0 1 14 0 v24 h8 z" />
      <path d="M9 -74 h14 a8 8 0 0 0 8 -8 v-22 a7 7 0 0 0 -14 0 v16 h-8 z" />
    </g>
  );
}

export function Scene({
  variant = "dusk",
  fade = true,
  className,
}: {
  variant?: SceneVariant;
  fade?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const p = PALETTES[variant];
  const u = (name: string) => `url(#${id}-${name})`;

  const sleepers = Array.from({ length: 16 }, (_, i) => {
    const t = Math.pow(i / 15, 1.9);
    const y = 618 + t * 400;
    const half = 10 + t * 250;
    return { y, half, w: 1 + t * 7 };
  });

  return (
    <svg
      viewBox="0 0 1440 1000"
      preserveAspectRatio="xMidYMid slice"
      className={cn("block h-full w-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.38" stopColor={p.sky[1]} />
          <stop offset="0.56" stopColor={p.sky[2]} />
          <stop offset="0.64" stopColor={p.sky[3]} />
        </linearGradient>
        <radialGradient id={`${id}-moon`} cx="0.5" cy="0.5" r="0.5" fx="0.4" fy="0.38">
          <stop offset="0" stopColor={p.moon} stopOpacity="0.42" />
          <stop offset="0.85" stopColor={p.moon} stopOpacity="0.16" />
          <stop offset="1" stopColor={p.moon} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.ground[0]} />
          <stop offset="0.35" stopColor={p.ground[1]} />
          <stop offset="1" stopColor={p.ground[2]} />
        </linearGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.haze} stopOpacity="0" />
          <stop offset="1" stopColor={p.haze} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1a1020" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#1a1020" stopOpacity="0" />
          <stop offset="1" stopColor="#1a1020" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.62" stopColor="#070707" stopOpacity="0" />
          <stop offset="0.86" stopColor="#070707" stopOpacity="0.85" />
          <stop offset="1" stopColor="#070707" />
        </linearGradient>
        <pattern
          id={`${id}-strata`}
          patternUnits="userSpaceOnUse"
          width="1440"
          height="168"
          patternTransform="rotate(-14)"
        >
          {p.strata.map((c, i) => (
            <rect key={c + i} x="0" y={i * 21} width="1440" height={i % 3 === 0 ? 24 : 21} fill={c} />
          ))}
        </pattern>
        <filter id={`${id}-paint`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="4" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="80" />
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id={`${id}-grass`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.18" numOctaves="3" seed="11" />
          <feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.09  0 0 0 0 0.02  0 0 0 0.9 -0.25" />
        </filter>
        <filter id={`${id}-rough`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="9" />
        </filter>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
        </filter>
      </defs>

      <rect width="1440" height="1000" fill={u("sky")} />

      {variant === "night" &&
        Array.from({ length: 70 }, (_, i) => (
          <circle
            key={i}
            cx={(i * 397) % 1440}
            cy={(i * 131) % 460}
            r={i % 7 === 0 ? 1.6 : 0.9}
            fill="#fff"
            opacity={0.35 + ((i * 37) % 60) / 100}
          />
        ))}

      <circle cx="600" cy="250" r="200" fill={u("moon")} />

      <g filter={u("paint")}>
        <ellipse cx="140" cy="300" rx="260" ry="120" fill={p.cloud[0]} opacity="0.95" />
        <ellipse cx="60" cy="420" rx="300" ry="90" fill={p.cloud[1]} opacity="0.85" />
        <ellipse cx="330" cy="470" rx="220" ry="60" fill={p.cloud[2]} opacity="0.7" />
        <ellipse cx="1300" cy="250" rx="240" ry="80" fill={p.cloud[0]} opacity="0.8" />
        <ellipse cx="1240" cy="380" rx="280" ry="70" fill={p.cloud[1]} opacity="0.75" />
        <ellipse cx="980" cy="120" rx="320" ry="60" fill={p.cloud[2]} opacity="0.45" />
        <ellipse cx="760" cy="500" rx="260" ry="34" fill={p.cloud[2]} opacity="0.55" />
      </g>

      <path
        d="M0 560 L120 520 L210 540 L330 495 L420 530 L560 500 L690 540 L820 505 L940 530 L1060 490 L1190 525 L1320 500 L1440 520 L1440 640 L0 640 Z"
        fill={p.far}
        opacity="0.75"
        filter={u("rough")}
      />

      <g filter={u("rough")}>
        <path
          d="M-20 640 C 80 560, 190 470, 300 452 C 360 440, 400 470, 450 500 C 520 540, 600 590, 690 640 Z"
          fill={u("strata")}
        />
        <path
          d="M-20 640 C 80 560, 190 470, 300 452 C 360 440, 400 470, 450 500 C 520 540, 600 590, 690 640 Z"
          fill={u("shade")}
        />
        <path
          d="M820 640 C 900 590, 990 520, 1080 470 C 1150 430, 1210 425, 1270 450 C 1340 480, 1400 540, 1460 580 L1460 640 Z"
          fill={u("strata")}
        />
        <path
          d="M820 640 C 900 590, 990 520, 1080 470 C 1150 430, 1210 425, 1270 450 C 1340 480, 1400 540, 1460 580 L1460 640 Z"
          fill={u("shade")}
        />
      </g>
      <rect x="0" y="430" width="1440" height="215" fill={u("haze")} />

      <g>
        <rect x="1012" y="600" width="76" height="12" rx="2" fill="#2a2730" />
        <rect x="1016" y="596" width="68" height="4" rx="1" fill="#4a5f86" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={1019 + i * 11} y="603" width="6" height="4" rx="1" fill="#ffd9a0" opacity="0.9" />
        ))}
      </g>

      <path d="M0 612 C 300 600, 600 606, 760 612 C 980 620, 1240 604, 1440 610 L1440 1000 L0 1000 Z" fill={u("ground")} />
      <rect x="0" y="606" width="1440" height="394" filter={u("grass")} opacity="0.6" />

      <g opacity="0.55">
        {sleepers.map((s, i) => (
          <rect
            key={i}
            x={720 - s.half - 10}
            y={s.y}
            width={(s.half + 10) * 2}
            height={s.w}
            fill="#2a2216"
          />
        ))}
      </g>
      <path d="M712 616 L470 1000" stroke="#cfa47a" strokeWidth="3" opacity="0.7" />
      <path d="M728 616 L970 1000" stroke="#cfa47a" strokeWidth="3" opacity="0.7" />

      <Cardon x={250} y={690} s={1.1} fill="#2c3520" />
      <Cardon x={300} y={668} s={0.6} fill="#38412a" />
      <Cardon x={1190} y={705} s={1.3} fill="#262f1c" />
      <Cardon x={1110} y={650} s={0.45} fill="#4a4f2e" />
      <Cardon x={140} y={640} s={0.35} fill="#575a33" />

      <g transform="translate(812 742)">
        <ellipse cx="0" cy="108" rx="28" ry="5" fill="#000" opacity="0.35" />
        <circle cx="0" cy="8" r="11" fill="#1f1b1a" />
        <path d="M-17 24 C -17 18, 17 18, 17 24 L 19 70 L -19 70 Z" fill="#3c4a63" />
        <path d="M-12 68 L -10 106 L -2 106 L 0 74 L 2 106 L 10 106 L 12 68 Z" fill="#1d1f26" />
        <path d="M-17 26 L -21 64 L -16 64 L -12 32 Z M17 26 L 21 64 L 16 64 L 12 32 Z" fill="#33405a" />
      </g>

      <rect width="1440" height="1000" filter={u("grain")} opacity="0.18" style={{ mixBlendMode: "overlay" }} />
      {fade && <rect width="1440" height="1000" fill={u("fade")} />}
    </svg>
  );
}
