/**
 * Zustand store for the KAIROS persistent proactive assistant.
 *
 * KAIROS observes terminal output, agent status changes, file changes,
 * and error patterns. On each tick it decides whether to act or stay quiet.
 * Actions that would block the user for more than the budget (default 15s)
 * are deferred as suggestions instead.
 *
 * Maintains an append-only daily log and persists state to localStorage.
 */

import { create } from "zustand";

// ── Constants ────────────────────────────────────────────────────────

const PERSISTED_STATE_KEY = "nyx:kairos-state:v1";
const MAX_OBSERVATIONS = 500;
const MAX_SUGGESTIONS = 100;
const MAX_DAILY_LOG_ENTRIES = 1000;
const DEFAULT_TICK_INTERVAL_MS = 30_000;
const DEFAULT_BUDGET_MS = 15_000;

// ── Types ────────────────────────────────────────────────────────────

export type KairosStatus = "sleeping" | "observing" | "acting" | "paused";

export interface KairosObservation {
  id: string;
  timestamp: number;
  type: "terminal_output" | "agent_status" | "file_change" | "error" | "pattern";
  source: string;
  summary: string;
  data: Record<string, unknown>;
  acted: boolean;
}

export interface KairosSuggestion {
  id: string;
  timestamp: number;
  type: "fix" | "optimization" | "reminder" | "insight";
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
  dismissed: boolean;
  applied: boolean;
  estimatedDuration: number;
}

export interface KairosState {
  status: KairosStatus;
  enabled: boolean;
  tickIntervalMs: number;
  budgetMs: number;
  observations: KairosObservation[];
  suggestions: KairosSuggestion[];
  dailyLogEntries: string[];
  lastTickAt: number | null;
  totalTicks: number;
  totalActions: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Initial state ────────────────────────────────────────────────────

const initialState: KairosState = {
  status: "sleeping",
  enabled: false,
  tickIntervalMs: DEFAULT_TICK_INTERVAL_MS,
  budgetMs: DEFAULT_BUDGET_MS,
  observations: [],
  suggestions: [],
  dailyLogEntries: [],
  lastTickAt: null,
  totalTicks: 0,
  totalActions: 0,
};

// ── Persistence ──────────────────────────────────────────────────────

interface PersistedKairosState {
  enabled: boolean;
  tickIntervalMs: number;
  budgetMs: number;
  dailyLogEntries: string[];
  dailyLogDate: string;
  totalTicks: number;
  totalActions: number;
}

function readPersistedState(): Partial<KairosState> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(PERSISTED_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedKairosState;
    const isToday = parsed.dailyLogDate === todayKey();
    return {
      enabled: parsed.enabled ?? false,
      tickIntervalMs: parsed.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS,
      budgetMs: parsed.budgetMs ?? DEFAULT_BUDGET_MS,
      dailyLogEntries: isToday ? (parsed.dailyLogEntries ?? []) : [],
      totalTicks: parsed.totalTicks ?? 0,
      totalActions: parsed.totalActions ?? 0,
    };
  } catch {
    return {};
  }
}

function persistState(state: KairosState): void {
  if (typeof window === "undefined") return;
  try {
    const data: PersistedKairosState = {
      enabled: state.enabled,
      tickIntervalMs: state.tickIntervalMs,
      budgetMs: state.budgetMs,
      dailyLogEntries: state.dailyLogEntries,
      dailyLogDate: todayKey(),
      totalTicks: state.totalTicks,
      totalActions: state.totalActions,
    };
    window.localStorage.setItem(PERSISTED_STATE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota/storage errors
  }
}

// ── Pure state transitions ───────────────────────────────────────────

export function setEnabled(state: KairosState, enabled: boolean): KairosState {
  if (state.enabled === enabled) return state;
  return {
    ...state,
    enabled,
    status: enabled ? "observing" : "sleeping",
  };
}

export function setTickInterval(state: KairosState, ms: number): KairosState {
  const clamped = Math.max(5_000, Math.min(300_000, ms));
  if (state.tickIntervalMs === clamped) return state;
  return { ...state, tickIntervalMs: clamped };
}

export function addObservation(
  state: KairosState,
  input: Omit<KairosObservation, "id" | "timestamp" | "acted">,
): KairosState {
  const observation: KairosObservation = {
    ...input,
    id: generateId(),
    timestamp: Date.now(),
    acted: false,
  };
  const observations = [...state.observations, observation].slice(-MAX_OBSERVATIONS);
  return { ...state, observations };
}

export function addSuggestion(
  state: KairosState,
  input: Omit<KairosSuggestion, "id" | "timestamp" | "dismissed" | "applied">,
): KairosState {
  const suggestion: KairosSuggestion = {
    ...input,
    id: generateId(),
    timestamp: Date.now(),
    dismissed: false,
    applied: false,
  };
  const suggestions = [...state.suggestions, suggestion].slice(-MAX_SUGGESTIONS);
  return { ...state, suggestions };
}

export function dismissSuggestion(state: KairosState, id: string): KairosState {
  let changed = false;
  const suggestions = state.suggestions.map((s) => {
    if (s.id !== id || s.dismissed) return s;
    changed = true;
    return { ...s, dismissed: true };
  });
  return changed ? { ...state, suggestions } : state;
}

export function applySuggestion(state: KairosState, id: string): KairosState {
  let changed = false;
  const suggestions = state.suggestions.map((s) => {
    if (s.id !== id || s.applied) return s;
    changed = true;
    return { ...s, applied: true };
  });
  if (!changed) return state;
  return { ...state, suggestions, totalActions: state.totalActions + 1 };
}

export function recordTick(state: KairosState): KairosState {
  return {
    ...state,
    lastTickAt: Date.now(),
    totalTicks: state.totalTicks + 1,
    status: state.enabled ? "observing" : state.status,
  };
}

export function appendLog(state: KairosState, entry: string): KairosState {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${entry}`;
  const dailyLogEntries = [...state.dailyLogEntries, logEntry].slice(-MAX_DAILY_LOG_ENTRIES);
  return { ...state, dailyLogEntries };
}

export function pause(state: KairosState): KairosState {
  if (state.status === "paused") return state;
  return { ...state, status: "paused" };
}

export function resume(state: KairosState): KairosState {
  if (state.status !== "paused") return state;
  return { ...state, status: state.enabled ? "observing" : "sleeping" };
}

export function clearObservations(state: KairosState): KairosState {
  if (state.observations.length === 0) return state;
  return { ...state, observations: [] };
}

// ── Getters (pure functions) ─────────────────────────────────────────

export function activeSuggestions(state: KairosState): KairosSuggestion[] {
  return state.suggestions.filter((s) => !s.dismissed && !s.applied);
}

export function recentObservations(state: KairosState, limit = 20): KairosObservation[] {
  return state.observations.slice(-limit);
}

export function observationsByType(
  state: KairosState,
  type: KairosObservation["type"],
): KairosObservation[] {
  return state.observations.filter((o) => o.type === type);
}

// ── Zustand store ────────────────────────────────────────────────────

interface KairosStore extends KairosState {
  setEnabled: (enabled: boolean) => void;
  setTickInterval: (ms: number) => void;
  addObservation: (obs: Omit<KairosObservation, "id" | "timestamp" | "acted">) => void;
  addSuggestion: (
    sug: Omit<KairosSuggestion, "id" | "timestamp" | "dismissed" | "applied">,
  ) => void;
  dismissSuggestion: (id: string) => void;
  applySuggestion: (id: string) => void;
  recordTick: () => void;
  appendLog: (entry: string) => void;
  pause: () => void;
  resume: () => void;
  clearObservations: () => void;

  activeSuggestions: () => KairosSuggestion[];
  recentObservations: (limit?: number) => KairosObservation[];
  observationsByType: (type: KairosObservation["type"]) => KairosObservation[];
}

export const useKairosStore = create<KairosStore>((set, get) => ({
  ...initialState,
  ...readPersistedState(),

  setEnabled: (enabled) => set((state) => setEnabled(state, enabled)),
  setTickInterval: (ms) => set((state) => setTickInterval(state, ms)),
  addObservation: (obs) => set((state) => addObservation(state, obs)),
  addSuggestion: (sug) => set((state) => addSuggestion(state, sug)),
  dismissSuggestion: (id) => set((state) => dismissSuggestion(state, id)),
  applySuggestion: (id) => set((state) => applySuggestion(state, id)),
  recordTick: () => set((state) => recordTick(state)),
  appendLog: (entry) => set((state) => appendLog(state, entry)),
  pause: () => set((state) => pause(state)),
  resume: () => set((state) => resume(state)),
  clearObservations: () => set((state) => clearObservations(state)),

  activeSuggestions: () => activeSuggestions(get()),
  recentObservations: (limit) => recentObservations(get(), limit),
  observationsByType: (type) => observationsByType(get(), type),
}));

// Persist on every state change (debounced via microtask batching)
let persistScheduled = false;
useKairosStore.subscribe((state) => {
  if (!persistScheduled) {
    persistScheduled = true;
    queueMicrotask(() => {
      persistScheduled = false;
      persistState(state);
    });
  }
});

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    persistState(useKairosStore.getState());
  });
}
