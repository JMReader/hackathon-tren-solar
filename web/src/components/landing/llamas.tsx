"use client";

import { useEffect, useRef, useState } from "react";
import type { Material, Mesh, Object3D } from "three/webgpu";
import { cn } from "@/lib/utils";
import { buildLlama, COATS, type LlamaRig } from "./llama-model";

type Three = typeof import("three/webgpu");
type Mode = "idle" | "graze";

/** Screen-space placement: x as a fraction of the width, distance in meters. */
type Spot = { x: number; d: number; s?: number; ry: number; mode: Mode; coat: keyof typeof COATS };

const LAYOUTS: Record<"hero" | "origin", { wide: Spot[]; narrow: Spot[] }> = {
  hero: {
    wide: [
      { x: 0.3, d: 26, ry: 0.55, mode: "idle", coat: "cream" },
      { x: 0.355, d: 24, s: 0.6, ry: 0.95, mode: "idle", coat: "cria" },
      { x: 0.71, d: 31, ry: -2.3, mode: "graze", coat: "brown" },
      { x: 0.9, d: 58, ry: -1.4, mode: "graze", coat: "dark" },
    ],
    narrow: [
      { x: 0.15, d: 42, ry: 0.6, mode: "idle", coat: "cream" },
      { x: 0.29, d: 40, s: 0.6, ry: 1, mode: "idle", coat: "cria" },
      { x: 0.86, d: 46, ry: -2.3, mode: "graze", coat: "brown" },
    ],
  },
  origin: {
    wide: [
      { x: 0.1, d: 26, ry: 0.4, mode: "graze", coat: "brown" },
      { x: 0.16, d: 24, s: 0.6, ry: 0.8, mode: "idle", coat: "cria" },
      { x: 0.89, d: 28, ry: -2.6, mode: "idle", coat: "cream" },
    ],
    narrow: [{ x: 0.85, d: 34, ry: -2.5, mode: "idle", coat: "cream" }],
  },
};

// Matches Scene: viewBox 1440x1000, slice, horizon at y=612.
function horizonY(w: number, h: number) {
  const s = Math.max(w / 1440, h / 1000);
  return (h - 1000 * s) / 2 + 612 * s;
}

function shadowTexture(T: Three) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export function Llamas({ layout, className }: { layout: keyof typeof LAYOUTS; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const T = await import("three/webgpu");
      if (disposed) return;
      const renderer = new T.WebGPURenderer({ canvas, antialias: true, alpha: true });
      try {
        await renderer.init();
      } catch {
        return;
      }
      if (disposed) return renderer.dispose();

      const backend = renderer.backend as { isWebGPUBackend?: boolean };
      canvas.dataset.backend = backend.isWebGPUBackend ? "webgpu" : "webgl2";
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new T.Scene();
      scene.fog = new T.Fog("#e8cdb2", 35, 150);
      scene.add(new T.HemisphereLight("#d3e3f0", "#7d7440", 1.7));
      const sun = new T.DirectionalLight("#ffc896", 2.6);
      sun.position.set(-6, 6, 8);
      scene.add(sun);
      const rim = new T.DirectionalLight("#ffb48c", 1.4);
      rim.position.set(2, 4, -12);
      scene.add(rim);

      const camera = new T.PerspectiveCamera(30, 1, 0.1, 300);
      camera.position.set(0, 1.3, 0);
      camera.lookAt(0, 1.3, -1);

      const shadowMat = new T.MeshBasicMaterial({ map: shadowTexture(T), transparent: true, depthWrite: false });
      const shadowGeo = new T.PlaneGeometry(2.6, 1.4);
      const spots = () => LAYOUTS[layout][canvas.clientWidth < 640 ? "narrow" : "wide"];
      let current: Spot[] | null = null;
      let llamas: (LlamaRig & { spot: Spot; seed: number })[] = [];

      const disposeTree = (root: Object3D) =>
        root.traverse((o) => {
          const m = o as Mesh;
          if (!m.isMesh || m.material === shadowMat) return;
          m.geometry.dispose();
          (m.material as Material).dispose();
        });

      const place = (next: Spot[]) => {
        current = next;
        llamas.forEach((l) => {
          scene.remove(l.root);
          disposeTree(l.root);
        });
        llamas = next.map((spot, i) => {
          const seed = i * 7 + 3;
          const l = buildLlama(T, COATS[spot.coat], seed);
          const sh = new T.Mesh(shadowGeo, shadowMat);
          sh.rotation.x = -Math.PI / 2;
          sh.position.y = 0.01;
          l.root.add(sh);
          l.root.scale.setScalar(spot.s ?? 1);
          l.root.rotation.y = spot.ry;
          scene.add(l.root);
          return { ...l, spot, seed };
        });
      };

      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        const full = Math.max(2 * horizonY(w, h), h);
        renderer.setSize(w, h, false);
        camera.aspect = w / full;
        camera.setViewOffset(w, full, 0, 0, w, h);
        camera.updateProjectionMatrix();
        const tanH = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
        if (spots() !== current) place(spots());
        llamas.forEach(({ root, spot }) => root.position.set((spot.x * 2 - 1) * tanH * spot.d, 0, -spot.d));
      };

      const pointer = { x: 0.5, y: 0.5 };
      const onPointer = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        pointer.x = (e.clientX - r.left) / r.width;
        pointer.y = (e.clientY - r.top) / r.height;
      };

      const target = new T.Vector3();
      const local = new T.Vector3();
      const tick = (ms: number) => {
        const t = ms / 1000;
        const tanH = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
        for (const l of llamas) {
          const k = l.seed * 1.7;
          const breathe = 1 + Math.sin(t * 1.6 + k) * 0.012;
          l.body.scale.set(1, breathe, 1 + (breathe - 1) * 0.6);

          const g = Math.min(1, Math.max(0, (Math.sin(t * 0.32 + k) + 0.2) / 0.6));
          const graze = l.spot.mode === "graze" ? g * g * (3 - 2 * g) : 0;
          l.neck.rotation.z = -graze * 1.85 + Math.sin(t * 0.7 + k) * 0.025;
          l.head.rotation.z = graze * -0.75 + Math.sin(t * 3.1 + k) * 0.03 * graze;

          target.set((pointer.x * 2 - 1) * tanH * l.spot.d, 1.3, -l.spot.d + 6);
          local.copy(target);
          l.root.worldToLocal(local);
          const want = Math.max(-0.75, Math.min(0.75, Math.atan2(-local.z, local.x)));
          const yaw = (1 - graze) * want;
          l.head.rotation.y += (yaw - l.head.rotation.y) * 0.05;

          l.ears.forEach((ear, i) => {
            const twitch = Math.pow(Math.max(0, Math.sin(t * 0.8 + k + i * 1.3)), 24);
            ear.rotation.z = -0.1 - twitch * 0.5;
          });
          l.tail.rotation.x = Math.sin(t * 2.2 + k) * 0.25;
          l.legs[0].rotation.z = graze * Math.sin(t * 0.9 + k) * 0.06;
        }
        renderer.render(scene, camera);
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let running = false;
      const setRunning = (on: boolean) => {
        if (on === running) return;
        running = on;
        renderer.setAnimationLoop(on && !reduce ? tick : null);
      };

      resize();
      tick(0);
      setReady(true);

      const ro = new ResizeObserver(() => {
        resize();
        if (!running || reduce) tick(performance.now());
      });
      ro.observe(canvas);
      const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting));
      io.observe(canvas);
      window.addEventListener("pointermove", onPointer, { passive: true });

      cleanup = () => {
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onPointer);
        renderer.setAnimationLoop(null);
        llamas.forEach((l) => disposeTree(l.root));
        shadowGeo.dispose();
        shadowMat.map?.dispose();
        shadowMat.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [layout]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn(
        "pointer-events-none block h-full w-full transition-opacity duration-1000",
        "[mask-image:linear-gradient(to_bottom,#000_66%,rgb(0_0_0/0.35)_84%,transparent_97%)]",
        ready ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
