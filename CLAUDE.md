# Nyx

AI terminal multiplexer for Windows. Fork of t3code with Claude Teams, notification rings, in-app browser, and Lightweight Gateway integration.

## Architecture

Electron monorepo: `apps/desktop` (shell), `apps/web` (React 19 SPA), `apps/server` (Bun backend), `packages/contracts` (shared types), `packages/shared` (utilities).

Communication: WebSocket RPC between web (renderer) and server (Bun process).

## Stack

Electron 40+, React 19, Vite 8, Tailwind 4, Zustand, xterm.js, node-pty, Effect.js, Bun, SQLite, TypeScript.

## Conventions

- Follow existing t3code patterns — same component structure, same Effect.js usage, same RPC patterns
- Package names use `@nyx/` prefix
- Themes: Eclipse (dark) and Dawn (light) defined in `apps/web/src/index.css`
- Design language matches t3code: same fonts (DM Sans), icons (lucide-react), Base UI components
- Violet accent `#7c3aed` is the brand color

## Key Commands

- `bun run dev` — start all dev servers
- `bun run build` — build all packages
- `bun run typecheck` — type check
- `bun run lint` — oxlint
- `bun run test` — vitest
- `bun run dist:desktop:win` — build Windows .exe

## Repository

github.com/templarsco/nyx
