"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type OrbState = "idle" | "listening" | "thinking" | "talking"

type OrbProps = {
  state?: OrbState
  colors?: [string, string]
  getVolume?: () => number
  inverted?: boolean
  seed?: number
  framed?: boolean
  className?: string
  label?: string
}

const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

// Fragment shader adapted from ElevenLabs UI's Orb (MIT), moved to GLSL ES 3.00 with a disc mask and premultiplied output.
const FRAGMENT = `#version 300 es
precision highp float;
uniform float uTime;
uniform float uAnimation;
uniform float uInverted;
uniform float uOffsets[7];
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uShadow;
uniform float uInputVolume;
uniform float uOutputVolume;
uniform float uOpacity;
uniform float uEdge;
uniform sampler2D uPerlinTexture;
in vec2 vUv;
out vec4 fragColor;

const float PI = 3.14159265358979323846;

bool drawOval(vec2 polarUv, vec2 polarCenter, float a, float b, bool reverseGradient, float softness, out vec4 color) {
  vec2 p = polarUv - polarCenter;
  float oval = (p.x * p.x) / (a * a) + (p.y * p.y) / (b * b);
  float edge = smoothstep(1.0, 1.0 - softness, oval);
  if (edge > 0.0) {
    float gradient = reverseGradient ? (1.0 - (p.x / a + 1.0) / 2.0) : ((p.x / a + 1.0) / 2.0);
    gradient = mix(0.5, gradient, 0.1);
    color = vec4(vec3(gradient), 0.85 * edge);
    return true;
  }
  return false;
}

vec3 colorRamp(float grayscale, vec3 color1, vec3 color2, vec3 color3, vec3 color4) {
  if (grayscale < 0.33) return mix(color1, color2, grayscale * 3.0);
  if (grayscale < 0.66) return mix(color2, color3, (grayscale - 0.33) * 3.0);
  return mix(color3, color4, (grayscale - 0.66) * 3.0);
}

vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(dot(hash2(i), f), dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
  return 0.5 + 0.5 * n;
}

float sharpRing(vec3 decomposed, float time) {
  float noise = mix(noise2D(vec2(decomposed.x, time) * 5.0), noise2D(vec2(decomposed.y, time) * 5.0), decomposed.z);
  noise = (noise - 0.5) * 2.5;
  return 1.0 + noise * 0.3 * 1.5;
}

float smoothRing(vec3 decomposed, float time) {
  float noise = mix(noise2D(vec2(decomposed.x, time) * 6.0), noise2D(vec2(decomposed.y, time) * 6.0), decomposed.z);
  noise = (noise - 0.5) * 5.0;
  return 0.9 + noise * 0.2;
}

float flow(vec3 decomposed, float time) {
  return mix(
    texture(uPerlinTexture, vec2(time, decomposed.x / 2.0)).r,
    texture(uPerlinTexture, vec2(time, decomposed.y / 2.0)).r,
    decomposed.z
  );
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float radius = length(uv);
  float theta = atan(uv.y, uv.x);
  if (theta < 0.0) theta += 2.0 * PI;

  vec3 decomposed = vec3(
    theta / (2.0 * PI),
    mod(theta / (2.0 * PI) + 0.5, 1.0) + 1.0,
    abs(theta / PI - 1.0)
  );

  float flowNoise = flow(decomposed, radius * 0.03 - uAnimation * 0.2) - 0.5;
  theta += flowNoise * mix(0.08, 0.25, uOutputVolume);

  vec4 color = vec4(1.0);
  float originalCenters[7] = float[7](0.0, 0.5 * PI, 1.0 * PI, 1.5 * PI, 2.0 * PI, 2.5 * PI, 3.0 * PI);
  float centers[7];
  for (int i = 0; i < 7; i++) {
    centers[i] = originalCenters[i] + 0.5 * sin(uTime / 20.0 + uOffsets[i]);
  }

  vec4 ovalColor;
  for (int i = 0; i < 7; i++) {
    float n = texture(uPerlinTexture, vec2(mod(centers[i] + uTime * 0.05, 1.0), 0.5)).r;
    float a = 0.5 + n * 0.3;
    float b = n * mix(3.5, 2.5, uInputVolume);
    float distTheta = min(abs(theta - centers[i]), min(abs(theta + 2.0 * PI - centers[i]), abs(theta - 2.0 * PI - centers[i])));
    if (drawOval(vec2(distTheta, radius), vec2(0.0), a, b, i % 2 == 1, 0.6, ovalColor)) {
      color.rgb = mix(color.rgb, ovalColor.rgb, ovalColor.a);
      color.a = max(color.a, ovalColor.a);
    }
  }

  float ringRadius1 = sharpRing(decomposed, uTime * 0.1);
  float ringRadius2 = smoothRing(decomposed, uTime * 0.1);
  float inputRadius1 = radius + uInputVolume * 0.2;
  float inputRadius2 = radius + uInputVolume * 0.15;
  float ringAlpha1 = (inputRadius2 >= ringRadius1) ? mix(0.2, 0.6, uInputVolume) : 0.0;
  float ringAlpha2 = smoothstep(ringRadius2 - 0.05, ringRadius2 + 0.05, inputRadius1) * mix(0.15, 0.45, uInputVolume);
  float totalRingAlpha = max(ringAlpha1, ringAlpha2);
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - vec3(totalRingAlpha));

  float luminance = mix(color.r, 1.0 - color.r, uInverted);
  color.rgb = colorRamp(luminance, uShadow, uColor1, uColor2, vec3(1.0));

  float disc = 1.0 - smoothstep(1.0 - uEdge, 1.0, radius);
  float alpha = color.a * uOpacity * disc;
  fragColor = vec4(color.rgb * alpha, alpha);
}`

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace("#", ""), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

function splitmix32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x9e3779b9) | 0
    let t = a ^ (a >>> 16)
    t = Math.imul(t, 0x21f0aaad)
    t ^= t >>> 15
    t = Math.imul(t, 0x735a2d97)
    return ((t ^= t >>> 15) >>> 0) / 4294967296
  }
}

// Tileable single-octave Perlin noise (16 cells, mid-grey at lattice points), matching the texture the original fetched from a CDN.
function noiseTexture(size = 256, cells = 16) {
  const random = splitmix32(1337)
  const gradients = Array.from({ length: cells * cells }, () => {
    const angle = random() * Math.PI * 2
    return [Math.cos(angle), Math.sin(angle)] as const
  })
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const dot = (gx: number, gy: number, x: number, y: number) => {
    const [ax, ay] = gradients[(gy % cells) * cells + (gx % cells)]
    return ax * x + ay * y
  }
  const data = new Uint8Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells
      const fy = (y / size) * cells
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const dx = fx - x0
      const dy = fy - y0
      const u = fade(dx)
      const v = fade(dy)
      const top = dot(x0, y0, dx, dy) * (1 - u) + dot(x0 + 1, y0, dx - 1, dy) * u
      const bottom = dot(x0, y0 + 1, dx, dy - 1) * (1 - u) + dot(x0 + 1, y0 + 1, dx - 1, dy - 1) * u
      const n = top * (1 - v) + bottom * v
      data[y * size + x] = Math.round(Math.min(1, Math.max(0, 0.5 + n * 0.42)) * 255)
    }
  }
  return { data, size }
}

let cachedNoise: ReturnType<typeof noiseTexture> | null = null

function clamp01(n: number) {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0
}

function Orb({
  state = "idle",
  colors = ["#ff5c0a", "#ffc4a3"],
  getVolume,
  inverted = false,
  seed = 7,
  framed = true,
  className,
  label,
}: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)
  const live = useRef({ state, colors, getVolume, inverted })
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    live.current = { state, colors, getVolume, inverted }
  }, [state, colors, getVolume, inverted])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: true })
    if (!gl) {
      queueMicrotask(() => setSupported(false))
      return
    }

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader")
      return shader
    }

    let program: WebGLProgram
    try {
      program = gl.createProgram()!
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link")
    } catch (error) {
      console.error("[Orb]", error)
      queueMicrotask(() => setSupported(false))
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, "aPosition")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    cachedNoise ??= noiseTexture()
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, cachedNoise.size, cachedNoise.size, 0, gl.RED, gl.UNSIGNED_BYTE, cachedNoise.data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    const u = (name: string) => gl.getUniformLocation(program, name)
    const uniforms = {
      time: u("uTime"),
      animation: u("uAnimation"),
      inverted: u("uInverted"),
      offsets: u("uOffsets"),
      color1: u("uColor1"),
      color2: u("uColor2"),
      input: u("uInputVolume"),
      output: u("uOutputVolume"),
      opacity: u("uOpacity"),
      edge: u("uEdge"),
    }
    const random = splitmix32(seed)
    gl.uniform1fv(uniforms.offsets, Array.from({ length: 7 }, () => random() * Math.PI * 2))
    gl.uniform1i(u("uPerlinTexture"), 0)
    gl.uniform3fv(u("uShadow"), hexToRgb("#1d1e2b"))

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform1f(uniforms.edge, Math.min(0.05, (2 / Math.max(1, canvas.width)) * 2))
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const color1 = hexToRgb(live.current.colors[0])
    const color2 = hexToRgb(live.current.colors[1])
    const sim = { time: 0, animation: 0.1, speed: 0.1, input: 0, output: 0, opacity: 0, inverted: live.current.inverted ? 1 : 0 }
    let visible = true
    let frame = 0
    let last = performance.now()

    const render = (now: number) => {
      frame = requestAnimationFrame(render)
      const delta = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!visible) return

      const { state: mode, getVolume: volume, colors: palette, inverted: inv } = live.current
      const pace = reducedMotion.matches ? 0.3 : 1
      sim.time += delta * 0.5 * pace
      sim.opacity = Math.min(1, sim.opacity + delta * 2)
      const t = sim.time * 2

      let targetIn = 0
      let targetOut = 0.3
      if (mode === "listening" && volume) {
        const level = clamp01(volume())
        targetIn = clamp01(0.15 + level * 1.4)
        targetOut = clamp01(0.35 + level * 0.9)
      } else if (mode === "listening") {
        targetIn = clamp01(0.55 + Math.sin(t * 3.2) * 0.35)
        targetOut = 0.45
      } else if (mode === "talking") {
        targetIn = clamp01(0.65 + Math.sin(t * 4.8) * 0.22)
        targetOut = clamp01(0.75 + Math.sin(t * 3.6) * 0.22)
      } else if (mode === "thinking") {
        targetIn = clamp01(0.38 + 0.07 * Math.sin(t * 0.7) + 0.05 * Math.sin(t * 2.1) * Math.sin(t * 0.37 + 1.2))
        targetOut = clamp01(0.48 + 0.12 * Math.sin(t * 1.05 + 0.6))
      }

      const follow = reducedMotion.matches ? 0.06 : 0.2
      sim.input += (targetIn - sim.input) * follow
      sim.output += (targetOut - sim.output) * follow
      const targetSpeed = 0.1 + (1 - Math.pow(sim.output - 1, 2)) * 0.9
      sim.speed += (targetSpeed - sim.speed) * 0.12
      sim.animation += delta * sim.speed * pace
      sim.inverted += ((inv ? 1 : 0) - sim.inverted) * 0.1

      const next1 = hexToRgb(palette[0])
      const next2 = hexToRgb(palette[1])
      for (let i = 0; i < 3; i++) {
        color1[i] += (next1[i] - color1[i]) * 0.08
        color2[i] += (next2[i] - color2[i]) * 0.08
      }

      const halo = haloRef.current
      if (halo) {
        const level = mode === "idle" ? 0.12 : sim.input
        halo.style.opacity = String(0.15 + level * 0.7)
        halo.style.transform = reducedMotion.matches ? "scale(1)" : `scale(${0.86 + level * 0.34})`
      }

      gl.uniform1f(uniforms.time, sim.time)
      gl.uniform1f(uniforms.animation, sim.animation)
      gl.uniform1f(uniforms.input, sim.input)
      gl.uniform1f(uniforms.output, sim.output)
      gl.uniform1f(uniforms.opacity, sim.opacity)
      gl.uniform1f(uniforms.inverted, sim.inverted)
      gl.uniform3fv(uniforms.color1, color1)
      gl.uniform3fv(uniforms.color2, color2)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const intersection = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
    intersection.observe(canvas)
    frame = requestAnimationFrame(render)

    const onLost = (event: Event) => {
      event.preventDefault()
      cancelAnimationFrame(frame)
    }
    canvas.addEventListener("webglcontextlost", onLost)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersection.disconnect()
      canvas.removeEventListener("webglcontextlost", onLost)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [seed])

  const visual = supported ? (
    <canvas ref={canvasRef} aria-hidden className="block size-full" />
  ) : (
    <div
      aria-hidden
      className="size-full animate-pulse rounded-full motion-reduce:animate-none"
      style={{ background: `radial-gradient(circle at 35% 30%, ${colors[1]}, ${colors[0]} 70%)` }}
    />
  )

  return (
    <div
      role="img"
      aria-label={label ?? "Visualización de voz"}
      className={cn(
        "relative isolate aspect-square rounded-full",
        framed &&
          (inverted
            ? "bg-white/6 p-1.5 shadow-[inset_0_2px_10px_rgb(0_0_0/0.45)]"
            : "bg-sunken p-1.5 shadow-[inset_0_2px_8px_rgb(12_12_22/0.12)]"),
        className,
      )}
    >
      <div
        ref={haloRef}
        aria-hidden
        className="pointer-events-none absolute -inset-[22%] -z-10 rounded-full opacity-0 will-change-[transform,opacity]"
        style={{ background: `radial-gradient(closest-side, ${colors[0]}66, ${colors[1]}33 55%, transparent)` }}
      />
      {framed ? (
        <div
          className={cn(
            "size-full overflow-hidden rounded-full",
            inverted ? "bg-night shadow-[inset_0_0_12px_rgb(0_0_0/0.35)]" : "bg-paper shadow-[inset_0_0_12px_rgb(12_12_22/0.06)]",
          )}
        >
          {visual}
        </div>
      ) : (
        visual
      )}
    </div>
  )
}

export { Orb, type OrbState }
