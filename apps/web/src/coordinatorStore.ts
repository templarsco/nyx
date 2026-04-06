/**
 * Zustand store for the Coordinator Mode — multi-agent orchestration.
 *
 * The coordinator receives high-level tasks, decomposes them into subtasks,
 * assigns workers in parallel, and synthesizes their results.
 */

import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────

export type CoordinatorPhase =
  | "idle"
  | "planning"
  | "researching"
  | "implementing"
  | "verifying"
  | "synthesizing";

export type WorkerStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface WorkerTask {
  id: string;
  parentTaskId: string;
  assignedTo: string | null;
  description: string;
  status: WorkerStatus;
  result: string | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  dependencies: string[];
}

export interface CoordinatorTask {
  id: string;
  description: string;
  phase: CoordinatorPhase;
  createdAt: number;
  completedAt: number | null;
  subtasks: WorkerTask[];
  synthesisResult: string | null;
}

// ── State ────────────────────────────────────────────────────────────

export interface CoordinatorState {
  enabled: boolean;
  currentTask: CoordinatorTask | null;
  taskHistory: CoordinatorTask[];
  maxParallelWorkers: number;
}

// ── Constants ────────────────────────────────────────────────────────

const DEFAULT_MAX_PARALLEL = 3;
const MAX_TASK_HISTORY = 50;

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ── Pure state transitions ───────────────────────────────────────────

export function setEnabled(state: CoordinatorState, enabled: boolean): CoordinatorState {
  return state.enabled === enabled ? state : { ...state, enabled };
}

export function startTask(state: CoordinatorState, description: string): CoordinatorState {
  const task: CoordinatorTask = {
    id: generateId(),
    description,
    phase: "planning",
    createdAt: Date.now(),
    completedAt: null,
    subtasks: [],
    synthesisResult: null,
  };
  return { ...state, currentTask: task };
}

export function setPhase(
  state: CoordinatorState,
  taskId: string,
  phase: CoordinatorPhase,
): CoordinatorState {
  if (state.currentTask === null || state.currentTask.id !== taskId) return state;
  if (state.currentTask.phase === phase) return state;
  return {
    ...state,
    currentTask: { ...state.currentTask, phase },
  };
}

export function addSubtask(
  state: CoordinatorState,
  parentTaskId: string,
  input: Omit<WorkerTask, "id" | "status" | "result" | "error" | "startedAt" | "completedAt">,
): CoordinatorState {
  if (state.currentTask === null || state.currentTask.id !== parentTaskId) return state;
  const subtask: WorkerTask = {
    ...input,
    id: generateId(),
    status: "queued",
    result: null,
    error: null,
    startedAt: null,
    completedAt: null,
  };
  return {
    ...state,
    currentTask: {
      ...state.currentTask,
      subtasks: [...state.currentTask.subtasks, subtask],
    },
  };
}

export function updateWorkerStatus(
  state: CoordinatorState,
  workerTaskId: string,
  status: WorkerStatus,
  result?: string,
  error?: string,
): CoordinatorState {
  if (state.currentTask === null) return state;
  const now = Date.now();
  let changed = false;
  const subtasks = state.currentTask.subtasks.map((w) => {
    if (w.id !== workerTaskId) return w;
    changed = true;
    return {
      ...w,
      status,
      ...(result !== undefined ? { result } : {}),
      ...(error !== undefined ? { error } : {}),
      ...(status === "running" && w.startedAt === null ? { startedAt: now } : {}),
      ...(status === "completed" || status === "failed" || status === "cancelled"
        ? { completedAt: now }
        : {}),
    };
  });
  return changed ? { ...state, currentTask: { ...state.currentTask, subtasks } } : state;
}

export function assignWorker(
  state: CoordinatorState,
  workerTaskId: string,
  teammateId: string,
): CoordinatorState {
  if (state.currentTask === null) return state;
  let changed = false;
  const subtasks = state.currentTask.subtasks.map((w) => {
    if (w.id !== workerTaskId) return w;
    if (w.assignedTo === teammateId) return w;
    changed = true;
    return { ...w, assignedTo: teammateId };
  });
  return changed ? { ...state, currentTask: { ...state.currentTask, subtasks } } : state;
}

export function completeTask(
  state: CoordinatorState,
  taskId: string,
  synthesisResult: string,
): CoordinatorState {
  if (state.currentTask === null || state.currentTask.id !== taskId) return state;
  const completed: CoordinatorTask = {
    ...state.currentTask,
    phase: "idle",
    completedAt: Date.now(),
    synthesisResult,
  };
  return {
    ...state,
    currentTask: null,
    taskHistory: [...state.taskHistory, completed].slice(-MAX_TASK_HISTORY),
  };
}

export function cancelTask(state: CoordinatorState, taskId: string): CoordinatorState {
  if (state.currentTask === null || state.currentTask.id !== taskId) return state;
  const now = Date.now();
  const cancelled: CoordinatorTask = {
    ...state.currentTask,
    phase: "idle",
    completedAt: now,
    subtasks: state.currentTask.subtasks.map((w) =>
      w.status === "queued" || w.status === "running"
        ? { ...w, status: "cancelled" as const, completedAt: now }
        : w,
    ),
  };
  return {
    ...state,
    currentTask: null,
    taskHistory: [...state.taskHistory, cancelled].slice(-MAX_TASK_HISTORY),
  };
}

export function setMaxParallelWorkers(state: CoordinatorState, max: number): CoordinatorState {
  const clamped = Math.max(1, Math.min(10, Math.round(max)));
  return state.maxParallelWorkers === clamped ? state : { ...state, maxParallelWorkers: clamped };
}

// ── Getters (pure functions) ─────────────────────────────────────────

export function runningWorkers(state: CoordinatorState): WorkerTask[] {
  return state.currentTask?.subtasks.filter((w) => w.status === "running") ?? [];
}

export function queuedWorkers(state: CoordinatorState): WorkerTask[] {
  return state.currentTask?.subtasks.filter((w) => w.status === "queued") ?? [];
}

export function canSpawnMore(state: CoordinatorState): boolean {
  return runningWorkers(state).length < state.maxParallelWorkers;
}

export function completedWorkers(state: CoordinatorState): WorkerTask[] {
  return state.currentTask?.subtasks.filter((w) => w.status === "completed") ?? [];
}

export function failedWorkers(state: CoordinatorState): WorkerTask[] {
  return state.currentTask?.subtasks.filter((w) => w.status === "failed") ?? [];
}

export function taskProgress(state: CoordinatorState): {
  total: number;
  done: number;
  percent: number;
} {
  const total = state.currentTask?.subtasks.length ?? 0;
  const done =
    state.currentTask?.subtasks.filter(
      (w) => w.status === "completed" || w.status === "failed" || w.status === "cancelled",
    ).length ?? 0;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// ── Initial state ────────────────────────────────────────────────────

const initialState: CoordinatorState = {
  enabled: false,
  currentTask: null,
  taskHistory: [],
  maxParallelWorkers: DEFAULT_MAX_PARALLEL,
};

// ── Zustand store ────────────────────────────────────────────────────

interface CoordinatorStore extends CoordinatorState {
  setEnabled: (enabled: boolean) => void;
  startTask: (description: string) => void;
  setPhase: (taskId: string, phase: CoordinatorPhase) => void;
  addSubtask: (
    parentTaskId: string,
    input: Omit<WorkerTask, "id" | "status" | "result" | "error" | "startedAt" | "completedAt">,
  ) => void;
  updateWorkerStatus: (
    workerTaskId: string,
    status: WorkerStatus,
    result?: string,
    error?: string,
  ) => void;
  assignWorker: (workerTaskId: string, teammateId: string) => void;
  completeTask: (taskId: string, synthesisResult: string) => void;
  cancelTask: (taskId: string) => void;
  setMaxParallelWorkers: (max: number) => void;

  runningWorkers: () => WorkerTask[];
  queuedWorkers: () => WorkerTask[];
  canSpawnMore: () => boolean;
  completedWorkers: () => WorkerTask[];
  failedWorkers: () => WorkerTask[];
  taskProgress: () => { total: number; done: number; percent: number };
}

export const useCoordinatorStore = create<CoordinatorStore>((set, get) => ({
  ...initialState,

  setEnabled: (enabled) => set((state) => setEnabled(state, enabled)),
  startTask: (description) => set((state) => startTask(state, description)),
  setPhase: (taskId, phase) => set((state) => setPhase(state, taskId, phase)),
  addSubtask: (parentTaskId, input) => set((state) => addSubtask(state, parentTaskId, input)),
  updateWorkerStatus: (workerTaskId, status, result, error) =>
    set((state) => updateWorkerStatus(state, workerTaskId, status, result, error)),
  assignWorker: (workerTaskId, teammateId) =>
    set((state) => assignWorker(state, workerTaskId, teammateId)),
  completeTask: (taskId, synthesisResult) =>
    set((state) => completeTask(state, taskId, synthesisResult)),
  cancelTask: (taskId) => set((state) => cancelTask(state, taskId)),
  setMaxParallelWorkers: (max) => set((state) => setMaxParallelWorkers(state, max)),

  runningWorkers: () => runningWorkers(get()),
  queuedWorkers: () => queuedWorkers(get()),
  canSpawnMore: () => canSpawnMore(get()),
  completedWorkers: () => completedWorkers(get()),
  failedWorkers: () => failedWorkers(get()),
  taskProgress: () => taskProgress(get()),
}));
