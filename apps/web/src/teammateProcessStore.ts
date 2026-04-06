import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Teammates in-process store.
 *
 * Manages the lifecycle of teammate worker processes — each teammate runs
 * as an isolated process with its own context (AsyncLocalStorage pattern).
 * Workers can be spawned as separate PTY processes or in-process with
 * context isolation.
 *
 * This is the "advanced" version of the teamsStore — while teamsStore tracks
 * UI state and metadata, this store manages the actual process lifecycle,
 * memory sharing, and synchronization between agents.
 */

export type ProcessIsolationMode = "pty" | "in-process";
export type ProcessSyncState = "synced" | "syncing" | "stale" | "error";

export interface TeammateProcess {
  readonly id: string;
  readonly teammateId: string; // Links to teamsStore teammate
  readonly isolationMode: ProcessIsolationMode;
  readonly pid: number | null; // OS process ID (null for in-process)
  readonly startedAt: number;
  readonly memoryUsageMb: number;
  readonly cpuPercent: number;

  // Context isolation
  readonly contextId: string; // AsyncLocalStorage context identifier
  readonly sharedMemoryKeys: string[]; // Keys this process can read from shared memory
  readonly ownedMemoryKeys: string[]; // Keys this process owns (write access)

  // Sync state
  readonly syncState: ProcessSyncState;
  readonly lastSyncAt: number | null;
  readonly pendingSyncOps: number;
}

export interface SharedMemoryEntry {
  readonly key: string;
  readonly ownerId: string; // Process ID that owns this entry
  readonly value: string; // JSON serialized
  readonly version: number; // Incremented on each write
  readonly updatedAt: number;
}

export interface ProcessHealthMetrics {
  readonly processId: string;
  readonly memoryUsageMb: number;
  readonly cpuPercent: number;
  readonly eventLoopLatencyMs: number;
  readonly uptimeMs: number;
  readonly restartCount: number;
}

interface TeammateProcessState {
  processes: TeammateProcess[];
  sharedMemory: SharedMemoryEntry[];
  healthMetrics: Record<string, ProcessHealthMetrics>;

  // Global settings
  defaultIsolationMode: ProcessIsolationMode;
  maxProcesses: number;
  memorySyncIntervalMs: number;
  healthCheckIntervalMs: number;
}

interface TeammateProcessActions {
  // Process lifecycle
  spawnProcess: (teammateId: string, mode?: ProcessIsolationMode) => string;
  killProcess: (processId: string) => void;
  restartProcess: (processId: string) => void;

  // Shared memory
  writeSharedMemory: (processId: string, key: string, value: string) => void;
  readSharedMemory: (key: string) => SharedMemoryEntry | null;
  deleteSharedMemory: (processId: string, key: string) => void;
  grantReadAccess: (processId: string, key: string) => void;
  revokeReadAccess: (processId: string, key: string) => void;

  // Sync
  requestSync: (processId: string) => void;
  updateSyncState: (processId: string, state: ProcessSyncState) => void;

  // Health
  updateHealthMetrics: (processId: string, metrics: Partial<ProcessHealthMetrics>) => void;

  // Settings
  setDefaultIsolationMode: (mode: ProcessIsolationMode) => void;
  setMaxProcesses: (max: number) => void;

  // Getters
  getProcessByTeammateId: (teammateId: string) => TeammateProcess | undefined;
  getProcessHealth: (processId: string) => ProcessHealthMetrics | undefined;
  isAtCapacity: () => boolean;
}

const initialState: TeammateProcessState = {
  processes: [],
  sharedMemory: [],
  healthMetrics: {},
  defaultIsolationMode: "pty",
  maxProcesses: 5,
  memorySyncIntervalMs: 5000,
  healthCheckIntervalMs: 10000,
};

export const useTeammateProcessStore = create<TeammateProcessState & TeammateProcessActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      spawnProcess: (teammateId, mode) => {
        const id = crypto.randomUUID();
        const contextId = crypto.randomUUID();
        const isolationMode = mode ?? get().defaultIsolationMode;

        const process: TeammateProcess = {
          id,
          teammateId,
          isolationMode,
          pid: null,
          startedAt: Date.now(),
          memoryUsageMb: 0,
          cpuPercent: 0,
          contextId,
          sharedMemoryKeys: [],
          ownedMemoryKeys: [],
          syncState: "synced",
          lastSyncAt: null,
          pendingSyncOps: 0,
        };

        set((state) => ({
          processes: [...state.processes, process],
          healthMetrics: {
            ...state.healthMetrics,
            [id]: {
              processId: id,
              memoryUsageMb: 0,
              cpuPercent: 0,
              eventLoopLatencyMs: 0,
              uptimeMs: 0,
              restartCount: 0,
            },
          },
        }));

        return id;
      },

      killProcess: (processId) => {
        set((state) => ({
          processes: state.processes.filter((p) => p.id !== processId),
          sharedMemory: state.sharedMemory.filter((m) => m.ownerId !== processId),
          healthMetrics: Object.fromEntries(
            Object.entries(state.healthMetrics).filter(([key]) => key !== processId),
          ),
        }));
      },

      restartProcess: (processId) => {
        set((state) => ({
          processes: state.processes.map((p) =>
            p.id === processId
              ? { ...p, startedAt: Date.now(), syncState: "synced" as const, pendingSyncOps: 0 }
              : p,
          ),
          healthMetrics: {
            ...state.healthMetrics,
            [processId]: {
              ...state.healthMetrics[processId]!,
              uptimeMs: 0,
              restartCount: (state.healthMetrics[processId]?.restartCount ?? 0) + 1,
            },
          },
        }));
      },

      writeSharedMemory: (processId, key, value) => {
        set((state) => {
          const existing = state.sharedMemory.find((m) => m.key === key && m.ownerId === processId);
          if (existing) {
            return {
              sharedMemory: state.sharedMemory.map((m) =>
                m.key === key && m.ownerId === processId
                  ? { ...m, value, version: m.version + 1, updatedAt: Date.now() }
                  : m,
              ),
            };
          }

          const entry: SharedMemoryEntry = {
            key,
            ownerId: processId,
            value,
            version: 1,
            updatedAt: Date.now(),
          };

          // Add key to owned list
          return {
            sharedMemory: [...state.sharedMemory, entry],
            processes: state.processes.map((p) =>
              p.id === processId
                ? { ...p, ownedMemoryKeys: [...new Set([...p.ownedMemoryKeys, key])] }
                : p,
            ),
          };
        });
      },

      readSharedMemory: (key) => {
        return get().sharedMemory.find((m) => m.key === key) ?? null;
      },

      deleteSharedMemory: (processId, key) => {
        set((state) => ({
          sharedMemory: state.sharedMemory.filter(
            (m) => !(m.key === key && m.ownerId === processId),
          ),
          processes: state.processes.map((p) =>
            p.id === processId
              ? { ...p, ownedMemoryKeys: p.ownedMemoryKeys.filter((k) => k !== key) }
              : p,
          ),
        }));
      },

      grantReadAccess: (processId, key) => {
        set((state) => ({
          processes: state.processes.map((p) =>
            p.id === processId
              ? { ...p, sharedMemoryKeys: [...new Set([...p.sharedMemoryKeys, key])] }
              : p,
          ),
        }));
      },

      revokeReadAccess: (processId, key) => {
        set((state) => ({
          processes: state.processes.map((p) =>
            p.id === processId
              ? { ...p, sharedMemoryKeys: p.sharedMemoryKeys.filter((k) => k !== key) }
              : p,
          ),
        }));
      },

      requestSync: (processId) => {
        set((state) => ({
          processes: state.processes.map((p) =>
            p.id === processId
              ? { ...p, syncState: "syncing" as const, pendingSyncOps: p.pendingSyncOps + 1 }
              : p,
          ),
        }));
      },

      updateSyncState: (processId, syncState) => {
        set((state) => ({
          processes: state.processes.map((p) =>
            p.id === processId
              ? {
                  ...p,
                  syncState,
                  lastSyncAt: syncState === "synced" ? Date.now() : p.lastSyncAt,
                  pendingSyncOps: syncState === "synced" ? 0 : p.pendingSyncOps,
                }
              : p,
          ),
        }));
      },

      updateHealthMetrics: (processId, metrics) => {
        set((state) => ({
          healthMetrics: {
            ...state.healthMetrics,
            [processId]: {
              ...(state.healthMetrics[processId] ?? {
                processId,
                memoryUsageMb: 0,
                cpuPercent: 0,
                eventLoopLatencyMs: 0,
                uptimeMs: 0,
                restartCount: 0,
              }),
              ...metrics,
            },
          },
        }));
      },

      setDefaultIsolationMode: (mode) => {
        set({ defaultIsolationMode: mode });
      },

      setMaxProcesses: (max) => {
        set({ maxProcesses: max });
      },

      getProcessByTeammateId: (teammateId) => {
        return get().processes.find((p) => p.teammateId === teammateId);
      },

      getProcessHealth: (processId) => {
        return get().healthMetrics[processId];
      },

      isAtCapacity: () => {
        return get().processes.length >= get().maxProcesses;
      },
    }),
    {
      name: "nyx:teammate-process:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        defaultIsolationMode: state.defaultIsolationMode,
        maxProcesses: state.maxProcesses,
        memorySyncIntervalMs: state.memorySyncIntervalMs,
        healthCheckIntervalMs: state.healthCheckIntervalMs,
        // Don't persist processes — they're ephemeral
      }),
    },
  ),
);
