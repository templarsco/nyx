# Nyx

The night terminal where AI agents work while you rest.

Nyx is a Windows-first AI terminal multiplexer that combines the best of [t3code](https://github.com/pingdotgg/t3code), [cmux](https://github.com/manaflow-ai/cmux), and [openclaude](https://github.com/Gitlawb/openclaude) into a unified experience with native [Lightweight AI Gateway](https://docs.lightweight.one/) integration.

## Features

- **Claude Code Teams** — Spawn and manage multiple AI agents in parallel with split view and command center modes
- **Notification Rings** — Blue pulsing indicators when agents need your attention, with configurable toast and panel modes
- **In-app Browser** — Split a Playwright-scriptable browser alongside your terminal for QA and preview
- **Workspaces + Free Terminals** — Project-based workspaces with chat/agents, plus standalone terminal splits like a traditional multiplexer
- **Collapsible Sidebar** — Rich metadata (git branch, PR status, ports, agent status) that collapses to icon-only mode
- **Lightweight Gateway** — Easy mode onboarding with one API key for 25+ AI models, plus advanced provider configuration
- **Eclipse & Dawn Themes** — Deep navy dark theme and warm lavender light theme with violet accent

## Install

### Windows (recommended)

```bash
winget install templarsco.nyx
```

Or download the latest `.exe` from [Releases](https://github.com/templarsco/nyx/releases).

## Development

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3.9
- [Node.js](https://nodejs.org/) >= 24.13.1
- Windows 10/11

### Setup

```bash
git clone https://github.com/templarsco/nyx.git
cd nyx
bun install
bun run dev
```

### Scripts

| Command                    | Description              |
| -------------------------- | ------------------------ |
| `bun run dev`              | Start all dev servers    |
| `bun run build`            | Build all packages       |
| `bun run typecheck`        | TypeScript type checking |
| `bun run lint`             | Lint with Oxlint         |
| `bun run test`             | Run tests with Vitest    |
| `bun run dist:desktop:win` | Build Windows installer  |

### Architecture

```
nyx/
├── apps/
│   ├── desktop/    # Electron shell
│   ├── web/        # React 19 SPA (UI)
│   ├── server/     # Bun backend (PTY, Agent SDK, RPC)
│   └── marketing/  # Landing page
├── packages/
│   ├── contracts/  # Shared types
│   └── shared/     # Shared utilities
└── scripts/        # Build tooling
```

## Credits

Built on the foundation of [t3code](https://github.com/pingdotgg/t3code) by [Ping](https://github.com/pingdotgg). Terminal multiplexing concepts inspired by [cmux](https://github.com/manaflow-ai/cmux). Multi-provider patterns from [openclaude](https://github.com/Gitlawb/openclaude).

## License

MIT
