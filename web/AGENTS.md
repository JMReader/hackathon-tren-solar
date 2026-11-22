<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## ui-sdk

Before using ui-sdk (`@ui-sdk/react` / `@ui-sdk/core`), follow the `ui-sdk` skill if it's installed, and read `node_modules/@ui-sdk/react/docs/llms.txt`. To build a new component, also search `node_modules/@ui-sdk/react/docs/core.md` by heading, and read `rendering.md` next to it.

## UI kit

Styled wrappers live in `src/components/ui/` on top of ui-sdk parts. The `/ui` route is the live showcase of every component and state; check it before adding a new pattern.

- Visual language follows AudioPen: night `#2d2e3e` canvas, cream `#f7f0f0` panels, white cards, slate ink `#3d3f54`, brand orange `#ff5c0a` for accents and `#cc4600` for CTAs/focus (white text on `#ff5c0a` fails AA). Fraunces for display, DM Sans for UI. Checked controls use ink; orange is reserved for the primary action and selected chips.
- `@ui-sdk/core/web.css` is intentionally not imported: it themed every part and clashed with the wrappers. All styling lives in `src/app/globals.css` (tokens + `focus-ring`, `pressable`, `control`, `popup`, `modal`, `backdrop` utilities) and `src/styles/components.css` (toast stack, drawer viewport, sliding indicators).
- Motion follows Emil Kowalski's rules: `--ease-out` cubic-bezier(.23,1,.32,1), press `scale(.97)`, popups scale from `--transform-origin`, exits faster than entrances, tooltips instant after the first, toasts 400ms `ease`, `prefers-reduced-motion` drops movement. Raised surfaces use semi-transparent shadows, not solid borders.
- Variants use `cva`; icons come from `lucide-react`. Wrappers that inject their own children type `children` as `ReactNode`.

## Audio components

Voice and audio UI lives in `src/components/audio/`, ported from ElevenLabs UI (https://ui.elevenlabs.io) onto this kit instead of installed with their CLI, which would overwrite `src/components/ui/` with Radix/shadcn versions. `useRecorder` owns the microphone and passes its `stream` to `LiveWaveform`, so recording and the live wave share one `getUserMedia` call. `useAudioPeaks` decodes real peaks from a Blob or URL; `seededPeaks` is a deterministic placeholder (never `Math.random()` in render). `AudioPlayerProvider` is event-driven and only ticks with rAF while playing; it also works around `MediaRecorder` webm files reporting `Infinity` duration. Scrubbers are ui-sdk Sliders, so they work with the keyboard. `Orb` is the ElevenLabs shader rewritten on raw WebGL2 (no three.js / @react-three, no CDN texture: the Perlin texture is generated in code); it reads mic level each frame through `useStreamVolume(stream)` and drives a CSS halo by writing `style` directly, never React state per frame. `useSpeechTranscript` wraps the browser Web Speech API (es-AR, live interim text, auto-restart after pauses); it only exists in Chrome, Edge and Safari, so callers must offer a typing fallback when `supported` is false.
