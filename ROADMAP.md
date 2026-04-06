# Nyx Roadmap

## v1 MVP — Status: In Progress

### Phase 1: Fork + Reskin + Themes ✅ COMPLETE

- [x] Clone t3code, remove git history, init fresh repo at templarsco/nyx
- [x] Rename all @t3tools → @nyx, T3 Code → Nyx, appId → com.templarsco.nyx
- [x] Apply Eclipse (dark) and Dawn (light) themes with violet accent #7c3aed
- [x] Generate NX monogram icon assets (prod violet, dev blue)
- [x] NX wordmark SVG in sidebar header
- [x] Update GitHub Actions for Windows-only CI/CD
- [x] Update README, CLAUDE.md, AGENTS.md, LICENSE
- [x] Regenerate bun.lock for renamed packages
- [x] Default terminal to PowerShell instead of cmd.exe

### Phase 2: Sidebar + Workspaces + Terminal Livre ✅ COMPLETE

- [x] workspaceStore: free terminals, custom naming, sidebar sections
- [x] Sidebar collapsible dual mode (icon/expanded) with Ctrl+B toggle
- [x] Sidebar Agents section showing active teammates with status dots
- [x] Sidebar Terminals section with add/rename/remove free terminals
- [x] Sidebar footer: ProviderHealthIndicator + KairosStatusIndicator

### Phase 3: Notification System ✅ COMPLETE

- [x] notificationStore: queue, ring states, notification modes
- [x] NotificationToast: auto-dismissing top-right popups
- [x] NotificationPanel: slide-in panel with Ctrl+Shift+N, grouped timeline
- [x] NotificationProvider: global wrapper with keyboard shortcuts
- [x] notificationRing.css: pulsing blue/yellow/green ring animations
- [x] Configurable between full mode (rings + toasts + panel) and simple mode
- [x] Wired into root layout

### Phase 4: Lightweight Gateway Integration ✅ COMPLETE

- [x] providerStore: multi-provider config, health tracking, onboarding state
- [x] OnboardingScreen: first-launch setup with Easy Mode + Advanced + Skip
- [x] Skip option: "use Claude & Codex defaults" for instant start
- [x] ModelSelector: dropdown in chat header for switching models
- [x] ProviderHealthIndicator: sidebar footer status dot
- [x] Wired into root layout and chat header

### Phase 5: In-app Browser (Playwright Bridge) ✅ COMPLETE

- [x] browserStore: pane management, history, security whitelist
- [x] BrowserPane: webview with URL bar, nav controls, error handling
- [x] BrowserToolbar: multi-pane tab management
- [x] Electron webviewTag enabled in main process
- [x] Ctrl+Shift+B toggle for browser split in thread view
- [x] Wired into thread route as split panel

### Phase 6: Claude Code Teams ✅ COMPLETE

- [x] teamsStore: teammate lifecycle, activity feed, view modes (split/center)
- [x] TeamsCommandCenter: grid of agent cards with status/actions/activity feed
- [x] TeamsSplitView: side-by-side panes for monitoring agents
- [x] TeammateCard: status-colored cards with ring animation
- [x] ActivityFeed: scrollable timeline of agent events
- [x] TeamsToggle: floating mode switcher with Ctrl+Shift+T
- [x] Wired into chat layout as overlay

### Phase 7: Installer & CI/CD ✅ COMPLETE

- [x] GitHub Actions CI: Format + Lint + Typecheck + Test (Windows runner)
- [x] GitHub Actions Release: Preflight + Build Windows x64 + Publish
- [x] electron-updater (Squirrel) auto-update configured
- [x] RELEASE_TOKEN for org with restricted default permissions
- [x] Winget manifest (future: winget install templarsco.nyx)
- [x] Release smoke tests

### Phase 8: Shared Contracts ✅ COMPLETE

- [x] notification.ts: Effect.js schemas for notification types, ring states
- [x] teams.ts: teammate, activity feed, WebSocket messages
- [x] teammateProcess.ts: process isolation, shared memory, health metrics
- [x] coordinator.ts: task phases, worker tasks, orchestration messages
- [x] kairos.ts: observations, suggestions, tick messages

---

## Wave 2 — Status: ✅ COMPLETE (Stores + UI + Wiring)

### Phase 9: Coordinator Mode ✅ COMPLETE

- [x] coordinatorStore: task planning, worker assignment, dependency tracking
- [x] CoordinatorDashboard: phase progress bar, worker grid, synthesis panel
- [x] TaskPlanner: high-level task input, decomposition, execute button
- [x] WorkerCard: status-colored with dependencies and result preview
- [x] Contracts: CoordinatorPhase, WorkerStatus, WebSocket messages
- [x] Wired: accessible from Teams Command Center header

### Phase 10: Teammates in-process ✅ COMPLETE

- [x] teammateProcessStore: process lifecycle, context isolation (AsyncLocalStorage)
- [x] Shared memory with versioned entries and read/write access control
- [x] Health metrics tracking (memory, CPU, event loop latency)
- [x] Sync state management between processes
- [x] Supports PTY and in-process isolation modes
- [x] Contracts: ProcessIsolationMode, SharedMemoryEntry, WebSocket messages

### Phase 11: KAIROS ✅ COMPLETE

- [x] kairosStore: tick-based observation, suggestions with 15s budget
- [x] KairosEngine: tick loop with visibility-aware pause/resume
- [x] Pattern detection: repeated errors, stuck agents, file churn, terminal noise
- [x] KairosPanel: suggestions list, interval config, observation controls
- [x] KairosStatusIndicator: animated sidebar widget (eye/moon/zap)
- [x] Contracts: KairosObservation, KairosSuggestion, tick messages
- [x] Wired: engine in root layout, indicator in sidebar footer

---

## Wave 3+ — Status: Not Started

### Phase 12: SSH & Remote Workspaces

- [ ] SSH native integration via ssh2 node library
- [ ] Remote workspaces as dedicated tabs/splits
- [ ] Browser panes routing through SSH tunnel
- [ ] Drag-and-drop file transfer via SCP
- [ ] Reconnect handling and latency management

### Phase 13: ULTRAPLAN

- [ ] Remote Opus planning sessions (up to 30 minutes)
- [ ] Browser-based approval interface
- [ ] Polling with 3s intervals from terminal
- [ ] **ULTRAPLAN_TELEPORT_LOCAL** sentintel for result transfer

### Phase 14: BRIDGE_MODE

- [ ] Remote instance connectivity between Nyx instances
- [ ] Cross-machine agent coordination
- [ ] Shared workspace state sync

### Phase 15: VOICE_MODE

- [ ] Voice input for commands and chat
- [ ] Speech-to-text integration
- [ ] Voice-triggered agent actions

### Phase 16: AFK Mode

- [ ] Agents continue working while user is away
- [ ] Smart task queuing and prioritization
- [ ] Summary report on return
- [ ] Integration with KAIROS for proactive monitoring

### Phase 17: Advanced Installer

- [ ] NSIS custom wizard installer
- [ ] Custom branding during install
- [ ] Auto-configure PATH and shell integration
- [ ] Winget package submission

---

## Release History

| Version        | Date       | Highlights                                 |
| -------------- | ---------- | ------------------------------------------ |
| v0.1.0-alpha.1 | 2026-04-06 | Initial fork + reskin + themes             |
| v0.1.0-alpha.2 | 2026-04-06 | Sidebar branding fix (Nyx Alpha)           |
| v0.1.0-alpha.3 | 2026-04-06 | NYX wordmark + PowerShell default + CI fix |
| v0.1.0-alpha.4 | 2026-04-06 | Wave 1 wiring + Wave 2 stores/components   |
| v0.1.0-alpha.5 | 2026-04-06 | 100% wired + NX icon + onboarding skip     |

---

## Source Projects

| Project                                              | What we took                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| [t3code](https://github.com/pingdotgg/t3code)        | Complete codebase: architecture, UI, components, patterns      |
| [cmux](https://github.com/manaflow-ai/cmux)          | Concepts: notification rings, browser panes, SSH, Claude Teams |
| [openclaude](https://github.com/Gitlawb/openclaude)  | Multi-provider patterns, MCP integration, agent coordination   |
| [Lightweight Gateway](https://docs.lightweight.one/) | AI provider gateway — unified access to 25+ models             |
