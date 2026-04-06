/**
 * Zustand store for managing AI agent teammates in the Teams feature.
 *
 * Supports two view modes: split (side-by-side panes) and center (command center grid).
 * Tracks teammate lifecycle, status changes, and an activity feed timeline.
 */

import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────

export type TeammateStatus = "idle" | "coding" | "waiting" | "error" | "completed";
export type TeamsViewMode = "split" | "center";

export interface Teammate {
  id: string;
  name: string;
  threadId: string;
  status: TeammateStatus;
  currentTask: string | null;
  branch: string | null;
  prNumber: number | null;
  prStatus: "open" | "merged" | "closed" | null;
  model: string;
  provider: string;
  activePorts: number[];
  startedAt: number;
  lastActivityAt: number;
  filesChanged: number;
  outputPreview: string | null;
}

export type ActivityEntryType =
  | "started"
  | "completed"
  | "error"
  | "waiting"
  | "status_change";

export interface ActivityEntry {
  id: string;
  timestamp: number;
  teammateId: string;
  teammateName: string;
  type: ActivityEntryType;
  message: string;
}

// ── State ────────────────────────────────────────────────────────────

export interface TeamsState {
  teammates: Teammate[];
  viewMode: TeamsViewMode;
  activityFeed: ActivityEntry[];
}

// ── Constants ────────────────────────────────────────────────────────

const MAX_ACTIVITY_ENTRIES = 200;

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ── Pure state transitions ───────────────────────────────────────────

export function addTeammate(
  state: TeamsState,
  input: Omit<Teammate, "id" | "startedAt" | "lastActivityAt" | "filesChanged" | "outputPreview">,
): TeamsState {
  const now = Date.now();
  const teammate: Teammate = {
    ...input,
    id: generateId(),
    startedAt: now,
    lastActivityAt: now,
    filesChanged: 0,
    outputPreview: null,
  };
  return {
    ...state,
    teammates: [...state.teammates, teammate],
  };
}

export function updateTeammate(
  state: TeamsState,
  id: string,
  updates: Partial<Teammate>,
): TeamsState {
  let changed = false;
  const teammates = state.teammates.map((t) => {
    if (t.id !== id) return t;
    changed = true;
    return { ...t, ...updates, lastActivityAt: Date.now() };
  });
  return changed ? { ...state, teammates } : state;
}

export function removeTeammate(state: TeamsState, id: string): TeamsState {
  const teammates = state.teammates.filter((t) => t.id !== id);
  return teammates.length === state.teammates.length
    ? state
    : { ...state, teammates };
}

export function setViewMode(state: TeamsState, mode: TeamsViewMode): TeamsState {
  return state.viewMode === mode ? state : { ...state, viewMode: mode };
}

export function addActivityEntry(
  state: TeamsState,
  input: Omit<ActivityEntry, "id" | "timestamp">,
): TeamsState {
  const entry: ActivityEntry = {
    ...input,
    id: generateId(),
    timestamp: Date.now(),
  };
  const activityFeed = [...state.activityFeed, entry].slice(-MAX_ACTIVITY_ENTRIES);
  return { ...state, activityFeed };
}

export function clearActivityFeed(state: TeamsState): TeamsState {
  return state.activityFeed.length === 0
    ? state
    : { ...state, activityFeed: [] };
}

// ── Getters (pure functions) ─────────────────────────────────────────

export function activeTeammates(state: TeamsState): Teammate[] {
  return state.teammates.filter(
    (t) => t.status === "coding" || t.status === "waiting",
  );
}

export function waitingTeammates(state: TeamsState): Teammate[] {
  return state.teammates.filter((t) => t.status === "waiting");
}

export function teammateById(
  state: TeamsState,
  id: string,
): Teammate | undefined {
  return state.teammates.find((t) => t.id === id);
}

// ── Initial state ────────────────────────────────────────────────────

const initialState: TeamsState = {
  teammates: [],
  viewMode: "center",
  activityFeed: [],
};

// ── Zustand store ────────────────────────────────────────────────────

interface TeamsStore extends TeamsState {
  addTeammate: (
    input: Omit<
      Teammate,
      "id" | "startedAt" | "lastActivityAt" | "filesChanged" | "outputPreview"
    >,
  ) => void;
  updateTeammate: (id: string, updates: Partial<Teammate>) => void;
  removeTeammate: (id: string) => void;
  setViewMode: (mode: TeamsViewMode) => void;
  addActivityEntry: (input: Omit<ActivityEntry, "id" | "timestamp">) => void;
  clearActivityFeed: () => void;

  activeTeammates: () => Teammate[];
  waitingTeammates: () => Teammate[];
  teammateById: (id: string) => Teammate | undefined;
}

export const useTeamsStore = create<TeamsStore>((set, get) => ({
  ...initialState,

  addTeammate: (input) => set((state) => addTeammate(state, input)),
  updateTeammate: (id, updates) => set((state) => updateTeammate(state, id, updates)),
  removeTeammate: (id) => set((state) => removeTeammate(state, id)),
  setViewMode: (mode) => set((state) => setViewMode(state, mode)),
  addActivityEntry: (input) => set((state) => addActivityEntry(state, input)),
  clearActivityFeed: () => set((state) => clearActivityFeed(state)),

  activeTeammates: () => activeTeammates(get()),
  waitingTeammates: () => waitingTeammates(get()),
  teammateById: (id) => teammateById(get(), id),
}));
