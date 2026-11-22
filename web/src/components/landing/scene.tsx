import { useId } from "react";
import { cn } from "@/lib/utils";

export type SceneVariant = "dusk" | "day" | "night";

const PALETTES: Record<
  SceneVariant,
  {
    sky: string[];
    moon: string;
    cloud: string[];
    far: string;
    mid: string;
    haze: string;
    ground: string[];
    strata: string[];
    shadow: string;
    light: string;
    adobe: string[];
    tree: string;
  }
> = {
  dusk: {
    sky: ["#4f7fa6", "#86a9c0", "#d7c0ad", "#f3b088"],
    moon: "#e8eef0",
    cloud: ["#ffd8bb", "#f6a987", "#fbe9dc"],
    far: "#7f8fae",
    mid: "#b78a86",
    haze: "#f6c7a5",
    ground: ["#9a8f45", "#5d5a24", "#2a2911"],
    strata: ["#a9473a", "#c7653f", "#d98f52", "#e9c48c", "#f1e0bd", "#9a5f7d", "#c77a6d", "#7f8c5c", "#b5523f", "#e3b27a", "#8d6a8f", "#6e7d58"],
    shadow: "#2b1428",
    light: "#ffe2c2",
    adobe: ["#c99a72", "#b8835d", "#d6b08a"],
    tree: "#3f4a24",
  },
  day: {
    sky: ["#3f86c4", "#7fb3d9", "#c8dbe3", "#efd9b9"],
    moon: "#ffffff",
    cloud: ["#ffffff", "#e6eef4", "#fbf5ec"],
    far: "#8aa3c2",
    mid: "#c49a8a",
    haze: "#e9dcc4",
    ground: ["#a49a4c", "#6b6a2c", "#2c2c12"],
    strata: ["#b9523f", "#d6744a", "#e7a05e", "#f2d39c", "#f7ead0", "#a8698a", "#d68978", "#8d9b66", "#c45f48", "#eebf86", "#9b77a0", "#7a8c63"],
    shadow: "#3a2033",
    light: "#fff4e0",
    adobe: ["#d4a780", "#c08f68", "#e2bf98"],
    tree: "#4b5a2a",
  },
  night: {
    sky: ["#0d1630", "#24335c", "#5b5378", "#b27a6e"],
    moon: "#f4efe2",
    cloud: ["#8a7c99", "#5c5577", "#c8a7a0"],
    far: "#3c4566",
    mid: "#5e4a5c",
    haze: "#9b7b86",
    ground: ["#4c4a2a", "#2b2a17", "#11110a"],
    strata: ["#6e3330", "#83483a", "#94643f", "#a58a68", "#b4a080", "#5f4562", "#835a55", "#56613f", "#753a32", "#9a7a58", "#5d4b66", "#4b5a40"],
    shadow: "#0f0a18",
    light: "#d9b8a8",
    adobe: ["#7a5f4c", "#6a503f", "#8a6f58"],
    tree: "#262c17",
  },
};

/** Band thicknesses for the strata pattern; summing to its tile height. */
const BANDS = [18, 10, 14, 8, 12, 16, 9, 13, 20, 8, 11, 15];
const BAND_TILE = BANDS.reduce((a, b) => a + b, 0);
const BAND_Y = BANDS.map((_, i) => BANDS.slice(0, i).reduce((a, b) => a + b, 0));

type Peak = { x: number; y: number; face: string };

/* Cerro de los Siete Colores (left) and a lower painted range (right). The base sits on the horizon at y=640. */
const LEFT = {
  outline:
    "M-40 640 L-40 548 C 0 530, 40 505, 80 488 L120 462 C 140 470, 160 485, 182 492 L248 408 C 270 430, 295 460, 318 470 L372 440 C 395 460, 418 488, 440 498 L500 486 C 540 515, 590 560, 640 600 L700 640 Z",
  peaks: [
    { x: 120, y: 462, face: "M120 462 L182 492 L196 640 L130 640 Z" },
    { x: 248, y: 408, face: "M248 408 L318 470 L340 640 L262 640 Z" },
    { x: 372, y: 440, face: "M372 440 L440 498 L470 640 L388 640 Z" },
    { x: 500, y: 486, face: "M500 486 C 540 515, 590 560, 640 600 L700 640 L520 640 Z" },
  ] as Peak[],
};

const RIGHT = {
  outline:
    "M780 640 C 820 600, 860 560, 900 528 L940 545 L1010 470 C 1030 485, 1050 495, 1066 500 L1112 446 C 1140 470, 1170 486, 1200 492 L1236 478 L1296 458 C 1330 470, 1360 490, 1390 500 L1460 470 L1460 640 Z",
  peaks: [
    { x: 900, y: 528, face: "M900 528 L940 545 L950 640 L905 640 Z" },
    { x: 1010, y: 470, face: "M1010 470 L1066 500 L1080 640 L1020 640 Z" },
    { x: 1112, y: 446, face: "M1112 446 L1200 492 L1215 640 L1125 640 Z" },
    { x: 1296, y: 458, face: "M1296 458 L1390 500 L1400 640 L1305 640 Z" },
  ] as Peak[],
};

/** Erosion gullies: short dark channels that start below the ridge and run downhill, never meeting at the peak. */
function gullies(pk: Peak) {
  return [-52, -30, -12, 14, 34, 56].map((o, i) => {
    const sx = pk.x + o;
    const sy = pk.y + Math.abs(o) * 0.85 + 10 + (i % 3) * 6;
    const ex = pk.x + o * 1.5 + (i % 2 ? 8 : -8);
    return `M${sx} ${sy} C ${sx + o * 0.1} ${sy + 50}, ${ex - o * 0.1} 560, ${ex} 640`;
  });
}

/* Purmamarca at the foot of the cerro: adobe houses, the church and its poplars. */
const HOUSES: [number, number, number][] = [
  [402, 18, 9],
  [424, 26, 11],
  [454, 14, 8],
  [472, 22, 10],
  [552, 20, 9],
  [576, 30, 12],
  [612, 16, 8],
  [632, 24, 10],
  [660, 14, 7],
];
const POPLARS: [number, number][] = [
  [394, 40],
  [446, 34],
  [500, 46],
  [546, 38],
  [604, 44],
  [688, 36],
];
const CAROBS: [number, number][] = [
  [438, 13],
  [598, 11],
  [678, 14],
];

function Village({ p }: { p: (typeof PALETTES)[SceneVariant] }) {
  const base = 612;
  return (
    <g>
      {POPLARS.map(([x, h]) => (
        <ellipse key={`p${x}`} cx={x} cy={base - h / 2} rx={4.5} ry={h / 2} fill={p.tree} />
      ))}
      {HOUSES.map(([x, w, h], i) => (
        <g key={`h${x}`}>
          <rect x={x} y={base - h} width={w} height={h} fill={p.adobe[i % 3]} />
          <rect x={x - 1} y={base - h - 1.5} width={w + 2} height={2} fill={p.adobe[1]} opacity="0.8" />
          <rect x={x + w * 0.3} y={base - h * 0.55} width={2} height={h * 0.55} fill={p.shadow} opacity="0.55" />
        </g>
      ))}
      <g>
        <rect x="508" y="597" width="28" height="15" fill={p.adobe[2]} />
        <path d="M506 597 L522 589 L538 597 Z" fill={p.adobe[1]} />
        <rect x="533" y="582" width="10" height="30" fill={p.adobe[2]} />
        <path d="M532 582 L538 575 L544 582 Z" fill={p.adobe[1]} />
        <rect x="537" y="571" width="1.2" height="5" fill={p.shadow} />
        <rect x="536" y="587" width="4" height="5" rx="2" fill={p.shadow} opacity="0.7" />
        <rect x="518" y="603" width="6" height="9" rx="3" fill={p.shadow} opacity="0.7" />
      </g>
      {CAROBS.map(([x, r]) => (
        <ellipse key={`c${x}`} cx={x} cy={base - r * 0.45} rx={r} ry={r * 0.55} fill={p.tree} opacity="0.92" />
      ))}
    </g>
  );
}

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
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.62" stopColor="#070707" stopOpacity="0" />
          <stop offset="0.86" stopColor="#070707" stopOpacity="0.85" />
          <stop offset="1" stopColor="#070707" />
        </linearGradient>
        {(["l", "r"] as const).map((side) => (
          <pattern
            key={side}
            id={`${id}-strata-${side}`}
            patternUnits="userSpaceOnUse"
            width="1600"
            height={BAND_TILE}
            patternTransform={side === "l" ? "rotate(-17)" : "rotate(13)"}
          >
            {p.strata.map((c, i) => (
              <rect key={c + i} x="0" y={BAND_Y[i]} width="1600" height={BANDS[i] + 0.5} fill={c} />
            ))}
          </pattern>
        ))}
        <clipPath id={`${id}-clip-l`}>
          <path d={LEFT.outline} />
        </clipPath>
        <clipPath id={`${id}-clip-r`}>
          <path d={RIGHT.outline} />
        </clipPath>
        <filter id={`${id}-warp`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0065" numOctaves="2" seed="5" />
          <feDisplacementMap in="SourceGraphic" scale="34" />
        </filter>
        <linearGradient id={`${id}-sun`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.light} stopOpacity="0.35" />
          <stop offset="0.55" stopColor={p.light} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-foot`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor={p.haze} stopOpacity="0" />
          <stop offset="1" stopColor={p.haze} stopOpacity="0.45" />
        </linearGradient>
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

      <path d="M540 640 C 610 584, 676 552, 740 548 C 806 544, 858 578, 920 640 Z" fill={p.mid} opacity="0.85" filter={u("rough")} />

      {([
        ["l", LEFT],
        ["r", RIGHT],
      ] as const).map(([side, range]) => (
        <g key={side} filter={u("rough")} transform="translate(0 640) scale(1 1.32) translate(0 -640)">
          <g clipPath={u(`clip-${side}`)}>
            <rect x="-60" y="380" width="1560" height="280" fill={u(`strata-${side}`)} filter={u("warp")} />
            <rect x="-60" y="380" width="1560" height="280" fill={u("sun")} />
            {range.peaks.map((pk) => (
              <path key={pk.x} d={pk.face} fill={p.shadow} opacity="0.3" />
            ))}
            {range.peaks.flatMap((pk) =>
              gullies(pk).map((d, i) => (
                <path key={`${pk.x}-${i}`} d={d} fill="none" stroke={p.shadow} strokeOpacity={0.1} strokeWidth={i % 2 ? 3 : 6} strokeLinecap="round" />
              )),
            )}
            <rect x="-60" y="380" width="1560" height="280" fill={u("foot")} />
          </g>
          <path d={range.outline} fill="none" stroke={p.light} strokeOpacity="0.35" strokeWidth="1.5" />
        </g>
      ))}
      <rect x="0" y="480" width="1440" height="165" fill={u("haze")} opacity="0.7" />

      <g>
        <rect x="1012" y="600" width="76" height="12" rx="2" fill="#2a2730" />
        <rect x="1016" y="596" width="68" height="4" rx="1" fill="#4a5f86" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={1019 + i * 11} y="603" width="6" height="4" rx="1" fill="#ffd9a0" opacity="0.9" />
        ))}
      </g>

      <path d="M0 612 C 300 600, 600 606, 760 612 C 980 620, 1240 604, 1440 610 L1440 1000 L0 1000 Z" fill={u("ground")} />
      <rect x="0" y="606" width="1440" height="394" filter={u("grass")} opacity="0.6" />

      <Village p={p} />

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
