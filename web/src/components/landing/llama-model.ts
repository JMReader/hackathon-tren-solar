import type { BufferGeometry, Color, Group, Material, Mesh, Vector3 } from "three/webgpu";

type Three = typeof import("three/webgpu");
type V3 = [number, number, number];

export type Coat = {
  wool: string;
  face: string;
  leg: string;
  patch?: string;
  pad: string;
};

export const COATS = {
  cream: { wool: "#e8dcc6", face: "#eee5d6", leg: "#ddcfb6", pad: "#3a2f29" },
  brown: { wool: "#7a4f33", face: "#efe6d8", leg: "#6b442c", patch: "#f0e7da", pad: "#2b211c" },
  cria: { wool: "#d6bf9c", face: "#e6d5b9", leg: "#cdb48f", pad: "#3a2f29" },
  dark: { wool: "#3a2b25", face: "#4a3830", leg: "#33261f", patch: "#e9e0d2", pad: "#1d1714" },
} satisfies Record<string, Coat>;

const TASSELS = ["#c8102e", "#ff5e3a", "#e83e8c", "#f4b400", "#7b2cbf", "#ff8c00"];

/* ---------- noise ---------- */

function hash(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(fx), v = s(fy), w = s(fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

function fbm(x: number, y: number, z: number) {
  return noise3(x, y, z) * 0.55 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.15;
}

/* ---------- geometry ---------- */

/** Round both ends of a radius profile so tubes close smoothly. */
function capped(r: number, t: number, a = 0.1, b = 0.1) {
  if (t < a) return r * Math.sqrt(1 - (1 - t / a) ** 2);
  if (t > 1 - b) return r * Math.sqrt(Math.max(0, 1 - (1 - (1 - t) / b) ** 2));
  return r;
}

/** Piecewise-linear profile from [t, value] stops. */
function profile(stops: [number, number][]) {
  return (t: number) => {
    for (let i = 1; i < stops.length; i++) {
      const [t1, v1] = stops[i];
      const [t0, v0] = stops[i - 1];
      if (t <= t1) {
        const k = (t - t0) / (t1 - t0);
        const e = k * k * (3 - 2 * k);
        return v0 + (v1 - v0) * e;
      }
    }
    return stops[stops.length - 1][1];
  };
}

type SweepOpts = {
  radius: (t: number) => number;
  /** lateral (side axis) and depth scale of the section */
  sx?: number | ((t: number) => number);
  sy?: number | ((t: number) => number);
  side?: V3;
  radial?: number;
  tubular?: number;
  /** outward displacement in meters */
  displace?: (p: Vector3, t: number) => number;
  color: (p: Vector3, d: Vector3, t: number) => Color;
};

/** Generalized cylinder along a smooth curve, with a closed, seamless ring. */
function sweep(T: Three, points: V3[], o: SweepOpts) {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)), false, "centripetal");
  const radial = o.radial ?? 24;
  const tubular = o.tubular ?? 40;
  const side = new T.Vector3(...(o.side ?? [0, 0, 1]));
  const val = (f: number | ((t: number) => number) | undefined, t: number) => (typeof f === "function" ? f(t) : (f ?? 1));

  const pos: number[] = [];
  const col: number[] = [];
  const tan = new T.Vector3(), b = new T.Vector3(), n = new T.Vector3(), d = new T.Vector3(), p = new T.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const c = curve.getPointAt(t);
    curve.getTangentAt(t, tan);
    b.copy(side).addScaledVector(tan, -side.dot(tan)).normalize();
    n.crossVectors(tan, b).normalize();
    const r = o.radius(t);
    const sx = val(o.sx, t), sy = val(o.sy, t);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      d.copy(b).multiplyScalar(Math.cos(a)).addScaledVector(n, Math.sin(a));
      p.copy(c).addScaledVector(b, Math.cos(a) * r * sx).addScaledVector(n, Math.sin(a) * r * sy);
      if (o.displace && r > 0.002) p.addScaledVector(d, o.displace(p, t) * Math.min(1, r * 25));
      pos.push(p.x, p.y, p.z);
      const k = o.color(p, d, t);
      col.push(k.r, k.g, k.b);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b2 = i * radial + ((j + 1) % radial);
      const c2 = a + radial, d2 = b2 + radial;
      idx.push(a, c2, b2, b2, c2, d2);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* ---------- llama ---------- */

export type LlamaRig = {
  root: Group;
  body: Mesh;
  neck: Group;
  head: Group;
  ears: Group[];
  tail: Group;
  legs: Group[];
};

export function buildLlama(T: Three, coat: Coat, seed: number): LlamaRig {
  const s = seed * 13.37;
  const tmp = new T.Color();
  const cWool = new T.Color(coat.wool), cFace = new T.Color(coat.face), cLeg = new T.Color(coat.leg);
  const cPatch = coat.patch ? new T.Color(coat.patch) : null;

  /** Coat color: base + piebald patches + fleece variation + cheap occlusion. */
  const shade = (base: Color, p: Vector3, d: Vector3, ao: number, patchBias = 0) => {
    tmp.copy(base);
    if (cPatch && noise3(p.x * 2.4 + s, p.y * 2.4, p.z * 2.4) + patchBias > 0.62) tmp.copy(cPatch);
    const v = fbm(p.x * 7 + s, p.y * 7, p.z * 7) - 0.5;
    const up = d.y * 0.5 + 0.5;
    return tmp.multiplyScalar((1 + v * 0.28) * (0.62 + 0.38 * up) * ao);
  };
  const fleece = (amp: number, freq = 9) => (p: Vector3) =>
    amp * (fbm(p.x * freq + s, p.y * freq, p.z * freq) - 0.35);

  const coatMat = new T.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.92,
    sheen: 1,
    sheenRoughness: 0.55,
    sheenColor: new T.Color("#fff1dc"),
  });
  const skinMat = new T.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.7,
    sheen: 0.5,
    sheenRoughness: 0.4,
    sheenColor: new T.Color("#fff4e6"),
  });
  const padMat = new T.MeshStandardMaterial({ color: coat.pad, roughness: 0.6 });
  const eyeMat = new T.MeshPhysicalMaterial({ color: "#0d0907", roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });
  const mesh = (g: BufferGeometry, m: Material) => new T.Mesh(g, m);

  const root = new T.Group();

  // Barrel body, deeper at the chest, rounded rump.
  const bodyR = profile([[0, 0.2], [0.18, 0.29], [0.5, 0.31], [0.82, 0.32], [1, 0.26]]);
  const body = mesh(
    sweep(T, [[-0.62, 1.07, 0], [-0.3, 1.05, 0], [0.1, 1.02, 0], [0.42, 1.02, 0], [0.6, 1.08, 0]], {
      radius: (t) => capped(bodyR(t), t, 0.16, 0.14),
      sx: 0.88,
      sy: (t) => 1.08 + 0.14 * Math.sin(Math.PI * t),
      radial: 56,
      tubular: 72,
      displace: fleece(0.04, 6),
      color: (p, d) => shade(cWool, p, d, 1),
    }),
    coatMat,
  );
  root.add(body);

  // Legs: slender, knee in front, hock behind, two-toed padded feet.
  const legs: Group[] = [];
  const legR = profile([[0, 0.085], [0.3, 0.062], [0.5, 0.048], [0.56, 0.054], [0.62, 0.044], [0.86, 0.038], [0.93, 0.043], [1, 0.036]]);
  const legDefs: { at: V3; pts: V3[] }[] = [
    { at: [0.4, 0, 0.1], pts: [[0, 1.02, 0], [0.01, 0.78, 0], [0.015, 0.52, 0], [0.0, 0.25, 0], [0.025, 0.05, 0]] },
    { at: [0.4, 0, -0.1], pts: [[0, 1.02, 0], [0.01, 0.78, 0], [0.015, 0.52, 0], [0.0, 0.25, 0], [0.025, 0.05, 0]] },
    { at: [-0.42, 0, 0.1], pts: [[0, 1.05, 0], [-0.05, 0.78, 0], [-0.09, 0.47, 0], [-0.04, 0.24, 0], [0.0, 0.05, 0]] },
    { at: [-0.42, 0, -0.1], pts: [[0, 1.05, 0], [-0.05, 0.78, 0], [-0.09, 0.47, 0], [-0.04, 0.24, 0], [0.0, 0.05, 0]] },
  ];
  for (const def of legDefs) {
    const g = new T.Group();
    g.position.set(...def.at);
    g.add(
      mesh(
        sweep(T, def.pts, {
          radius: (t) => capped(legR(t), t, 0.02, 0.04),
          sx: 0.9,
          radial: 16,
          tubular: 40,
          displace: (p, t) => (t < 0.38 ? fleece(0.025, 7)(p) * (1 - t / 0.38) : 0),
          color: (p, d, t) => shade(t < 0.36 ? cWool : cLeg, p, d, 0.7 + 0.3 * Math.min(1, t * 3), t > 0.4 ? -1 : 0),
        }),
        coatMat,
      ),
    );
    const foot = def.pts[def.pts.length - 1];
    for (const z of [0.019, -0.019]) {
      const toe = new T.Mesh(new T.SphereGeometry(0.028, 12, 8), padMat);
      toe.scale.set(1.7, 0.75, 0.85);
      toe.position.set(foot[0] + 0.03, 0.018, z);
      g.add(toe);
    }
    root.add(g);
    legs.push(g);
  }

  // Long S-shaped neck; the head hangs off its top.
  const neck = new T.Group();
  neck.position.set(0.44, 1.12, 0);
  const neckPts: V3[] = [[-0.1, -0.12, 0], [0.06, 0.2, 0], [0.12, 0.46, 0], [0.13, 0.66, 0], [0.16, 0.8, 0]];
  neck.add(
    mesh(
      sweep(T, neckPts, {
        radius: (t) => capped(profile([[0, 0.17], [0.25, 0.15], [0.7, 0.11], [1, 0.1]])(t), t, 0.08, 0.06),
        sx: 0.82,
        side: [0, 0, 1],
        radial: 28,
        tubular: 40,
        displace: (p, t) => fleece(0.035 * (1 - t * 0.7), 7)(p),
        color: (p, d, t) => shade(t > 0.85 ? cFace : cWool, p, d, 0.85 + 0.15 * t, t > 0.7 ? 0.15 : 0),
      }),
      coatMat,
    ),
  );
  root.add(neck);

  // Head: rounded cranium tapering to a long, soft muzzle.
  const head = new T.Group();
  head.position.set(0.17, 0.83, 0);
  neck.add(head);
  const headR = profile([[0, 0.07], [0.2, 0.092], [0.42, 0.08], [0.7, 0.062], [0.9, 0.058], [1, 0.05]]);
  head.add(
    mesh(
      sweep(T, [[-0.09, 0.03, 0], [0.0, 0.02, 0], [0.12, -0.02, 0], [0.24, -0.07, 0]], {
        radius: (t) => capped(headR(t), t, 0.22, 0.2),
        sx: (t) => 0.86 - 0.08 * t,
        sy: (t) => 1.12 - 0.1 * t,
        radial: 28,
        tubular: 34,
        displace: (p, t) => (t < 0.2 ? fleece(0.03, 14)(p) * (1 - t / 0.2) : 0),
        color: (p, d, t) => {
          const k = shade(cFace, p, d, 0.92, 0.1);
          return t > 0.88 ? k.multiplyScalar(0.72) : k;
        },
      }),
      skinMat,
    ),
  );
  // Top-knot of fleece between the ears.
  head.add(
    mesh(
      sweep(T, [[-0.1, 0.08, 0], [-0.04, 0.12, 0], [0.03, 0.1, 0]], {
        radius: (t) => capped(0.05, t, 0.4, 0.4),
        sx: 1.4,
        radial: 16,
        tubular: 14,
        displace: fleece(0.03, 16),
        color: (p, d) => shade(cWool, p, d, 1),
      }),
      coatMat,
    ),
  );
  for (const z of [0.067, -0.067]) {
    const eye = new T.Mesh(new T.SphereGeometry(0.017, 16, 12), eyeMat);
    eye.position.set(0.035, 0.035, z);
    eye.scale.set(1.15, 1, 0.7);
    head.add(eye);
  }
  for (const z of [0.018, -0.018]) {
    const nostril = new T.Mesh(new T.SphereGeometry(0.009, 8, 6), padMat);
    nostril.position.set(0.245, -0.055, z);
    nostril.scale.set(0.6, 1.4, 1);
    head.add(nostril);
  }

  // Banana ears with Andean wool tassels.
  const ears: Group[] = [];
  [1, -1].forEach((sgn, i) => {
    const g = new T.Group();
    g.position.set(-0.05, 0.085, 0.045 * sgn);
    g.rotation.x = 0.22 * sgn;
    g.add(
      mesh(
        sweep(T, [[0, 0, 0], [0.012, 0.08, 0.012 * sgn], [0.03, 0.15, -0.004 * sgn], [0.045, 0.2, -0.02 * sgn]], {
          radius: (t) => capped(profile([[0, 0.022], [0.35, 0.03], [0.75, 0.022], [1, 0.008]])(t), t, 0.05, 0.25),
          sx: 1,
          sy: 0.42,
          side: [0, 0, 1],
          radial: 14,
          tubular: 18,
          color: (p, d) => shade(cFace, p, d, d.x > 0 ? 0.7 : 1),
        }),
        skinMat,
      ),
    );
    const yarn = (c: string) => new T.MeshPhysicalMaterial({ color: c, roughness: 0.9, sheen: 1, sheenRoughness: 0.5, sheenColor: new T.Color(c) });
    const c1 = TASSELS[(seed + i * 2) % TASSELS.length];
    const c2 = TASSELS[(seed + i * 2 + 3) % TASSELS.length];
    const pom = new T.Mesh(new T.IcosahedronGeometry(0.026, 2), yarn(c1));
    pom.position.set(0.012, 0.06, 0.022 * sgn);
    g.add(pom);
    for (let k = 0; k < 3; k++) {
      const strand = new T.Mesh(new T.CylinderGeometry(0.005, 0.008, 0.09, 5), yarn(k === 1 ? c2 : c1));
      strand.position.set(0.012 + (k - 1) * 0.01, 0.02, 0.026 * sgn);
      strand.rotation.z = (k - 1) * 0.15;
      g.add(strand);
    }
    head.add(g);
    ears.push(g);
  });

  // Short fluffy tail carried low.
  const tail = new T.Group();
  tail.position.set(-0.6, 1.12, 0);
  tail.add(
    mesh(
      sweep(T, [[0.02, 0.02, 0], [-0.06, 0.03, 0], [-0.1, -0.04, 0], [-0.11, -0.13, 0]], {
        radius: (t) => capped(0.055, t, 0.25, 0.4),
        radial: 16,
        tubular: 16,
        displace: fleece(0.03, 14),
        color: (p, d) => shade(cWool, p, d, 0.95),
      }),
      coatMat,
    ),
  );
  root.add(tail);

  return { root, body, neck, head, ears, tail, legs };
}
