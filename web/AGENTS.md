<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## ui-sdk

Before using ui-sdk (`@ui-sdk/react` / `@ui-sdk/core`), follow the `ui-sdk` skill if it's installed, and read `node_modules/@ui-sdk/react/docs/llms.txt`. To build a new component, also search `node_modules/@ui-sdk/react/docs/core.md` by heading, and read `rendering.md` next to it.

## UI kit

Styled wrappers live in `src/components/ui/` (Granola "oats" theme: cream `#f7f7f2`, ink `#292929`, olive accent `#5b6f00`, pill buttons, hairline borders). Tokens map to `--ui-*` in `src/app/globals.css`. The `/ui` route is a live showcase of every component and state — check it before adding a new pattern.
