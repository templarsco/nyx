# AGENTS.md

## Task Completion Requirements

- All of `bun fmt`, `bun lint`, and `bun typecheck` must pass before considering tasks completed.
- NEVER run `bun test`. Always use `bun run test` (runs Vitest).

## Project Snapshot

Nyx is an AI terminal multiplexer for Windows, combining the GUI foundation of t3code with terminal multiplexing from cmux, multi-provider support from openclaude, and Lightweight AI Gateway integration.

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures (session restarts, reconnects, partial streams).

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Package Roles

- `apps/server`: Bun WebSocket server. Wraps agent CLIs (Codex, Claude), serves the React web app, manages provider sessions, and coordinates agent teams.
- `apps/web`: React/Vite UI. Owns session UX, conversation/event rendering, client-side state, notifications, sidebar, browser panes, and team management. Connects to the server via WebSocket.
- `packages/contracts`: Shared Effect/Schema schemas and TypeScript contracts for provider events, WebSocket protocol, and model/session types. Keep this package schema-only — no runtime logic.
- `packages/shared`: Shared runtime utilities consumed by both server and web. Uses explicit subpath exports (e.g. `@nyx/shared/git`) — no barrel index.

## Design Language

- Follow t3code's visual patterns: same fonts (DM Sans), icons (lucide-react), Base UI components, spacing, animations
- Brand color: violet `#7c3aed`
- Themes: Eclipse (dark navy) and Dawn (light lavender)
- New components (notifications, browser pane, teams) follow the same design system

## Reference Repos

- t3code (base): https://github.com/pingdotgg/t3code
- cmux (terminal multiplexing concepts): https://github.com/manaflow-ai/cmux
- openclaude (multi-provider): https://github.com/Gitlawb/openclaude
- Lightweight Gateway: https://docs.lightweight.one/
- Codex App Server: https://developers.openai.com/codex/sdk/#app-server
