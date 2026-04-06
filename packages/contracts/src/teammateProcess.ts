import { Schema } from "effect";
import { TeammateId } from "./notification";

/**
 * Process isolation mode for teammate workers.
 */
export const ProcessIsolationMode = Schema.Literals(["pty", "in-process"]);
export type ProcessIsolationMode = typeof ProcessIsolationMode.Type;

/**
 * Synchronization state between processes.
 */
export const ProcessSyncState = Schema.Literals(["synced", "syncing", "stale", "error"]);
export type ProcessSyncState = typeof ProcessSyncState.Type;

/**
 * Shared memory entry between teammate processes.
 */
export const SharedMemoryEntry = Schema.Struct({
  key: Schema.String,
  ownerId: Schema.String,
  value: Schema.String,
  version: Schema.Number,
  updatedAt: Schema.Number,
});
export type SharedMemoryEntry = typeof SharedMemoryEntry.Type;

/**
 * Health metrics for a teammate process.
 */
export const ProcessHealthMetrics = Schema.Struct({
  processId: Schema.String,
  memoryUsageMb: Schema.Number,
  cpuPercent: Schema.Number,
  eventLoopLatencyMs: Schema.Number,
  uptimeMs: Schema.Number,
  restartCount: Schema.Number,
});
export type ProcessHealthMetrics = typeof ProcessHealthMetrics.Type;

/**
 * WebSocket messages for process management.
 */
export const ProcessSpawnedMessage = Schema.Struct({
  channel: Schema.Literals(["process.spawned"]),
  payload: Schema.Struct({
    processId: Schema.String,
    teammateId: TeammateId,
    isolationMode: ProcessIsolationMode,
    contextId: Schema.String,
    pid: Schema.NullOr(Schema.Number),
  }),
});
export type ProcessSpawnedMessage = typeof ProcessSpawnedMessage.Type;

export const ProcessHealthMessage = Schema.Struct({
  channel: Schema.Literals(["process.health"]),
  payload: ProcessHealthMetrics,
});
export type ProcessHealthMessage = typeof ProcessHealthMessage.Type;

export const SharedMemoryUpdateMessage = Schema.Struct({
  channel: Schema.Literals(["process.memory.update"]),
  payload: SharedMemoryEntry,
});
export type SharedMemoryUpdateMessage = typeof SharedMemoryUpdateMessage.Type;
