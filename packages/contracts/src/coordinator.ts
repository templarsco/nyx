import { Schema } from "effect";
import { TeammateId } from "./notification";

// ── Branded IDs ─────────────────────────────────────────────────────

const makeEntityId = (brand: string) =>
  Schema.Trim.check(Schema.isNonEmpty()).pipe(Schema.brand(brand));

export const CoordinatorTaskId = makeEntityId("CoordinatorTaskId");
export type CoordinatorTaskId = typeof CoordinatorTaskId.Type;

export const WorkerTaskId = makeEntityId("WorkerTaskId");
export type WorkerTaskId = typeof WorkerTaskId.Type;

// ── Enums ───────────────────────────────────────────────────────────

/**
 * Phase of a coordinator task lifecycle.
 */
export const CoordinatorPhase = Schema.Literals([
  "idle",
  "planning",
  "researching",
  "implementing",
  "verifying",
  "synthesizing",
]);
export type CoordinatorPhase = typeof CoordinatorPhase.Type;

/**
 * Status of an individual worker task.
 */
export const WorkerStatus = Schema.Literals([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type WorkerStatus = typeof WorkerStatus.Type;

// ── Schemas ─────────────────────────────────────────────────────────

/**
 * A single worker subtask managed by the coordinator.
 */
export const WorkerTask = Schema.Struct({
  id: WorkerTaskId,
  parentTaskId: CoordinatorTaskId,
  assignedTo: Schema.NullOr(TeammateId),
  description: Schema.String,
  status: WorkerStatus,
  result: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String),
  startedAt: Schema.NullOr(Schema.Number),
  completedAt: Schema.NullOr(Schema.Number),
  dependencies: Schema.Array(WorkerTaskId),
});
export type WorkerTask = typeof WorkerTask.Type;

/**
 * A coordinator task that decomposes work into parallel subtasks.
 */
export const CoordinatorTask = Schema.Struct({
  id: CoordinatorTaskId,
  description: Schema.String,
  phase: CoordinatorPhase,
  createdAt: Schema.Number,
  completedAt: Schema.NullOr(Schema.Number),
  subtasks: Schema.Array(WorkerTask),
  synthesisResult: Schema.NullOr(Schema.String),
});
export type CoordinatorTask = typeof CoordinatorTask.Type;

// ── WebSocket Messages ──────────────────────────────────────────────

/**
 * Coordinator task has been created and is beginning planning.
 */
export const CoordinatorTaskCreatedMessage = Schema.Struct({
  channel: Schema.Literals(["coordinator.task.created"]),
  payload: CoordinatorTask,
});
export type CoordinatorTaskCreatedMessage = typeof CoordinatorTaskCreatedMessage.Type;

/**
 * Coordinator task phase has changed.
 */
export const CoordinatorPhaseUpdateMessage = Schema.Struct({
  channel: Schema.Literals(["coordinator.task.phase"]),
  payload: Schema.Struct({
    taskId: CoordinatorTaskId,
    phase: CoordinatorPhase,
  }),
});
export type CoordinatorPhaseUpdateMessage = typeof CoordinatorPhaseUpdateMessage.Type;

/**
 * A worker subtask status has changed.
 */
export const CoordinatorWorkerStatusMessage = Schema.Struct({
  channel: Schema.Literals(["coordinator.worker.status"]),
  payload: Schema.Struct({
    taskId: CoordinatorTaskId,
    workerTaskId: WorkerTaskId,
    status: WorkerStatus,
    assignedTo: Schema.NullOr(TeammateId),
    result: Schema.NullOr(Schema.String),
    error: Schema.NullOr(Schema.String),
  }),
});
export type CoordinatorWorkerStatusMessage = typeof CoordinatorWorkerStatusMessage.Type;

/**
 * Coordinator task has been completed with a synthesis result.
 */
export const CoordinatorTaskCompletedMessage = Schema.Struct({
  channel: Schema.Literals(["coordinator.task.completed"]),
  payload: Schema.Struct({
    taskId: CoordinatorTaskId,
    synthesisResult: Schema.String,
  }),
});
export type CoordinatorTaskCompletedMessage = typeof CoordinatorTaskCompletedMessage.Type;

/**
 * Coordinator task has been cancelled.
 */
export const CoordinatorTaskCancelledMessage = Schema.Struct({
  channel: Schema.Literals(["coordinator.task.cancelled"]),
  payload: Schema.Struct({
    taskId: CoordinatorTaskId,
  }),
});
export type CoordinatorTaskCancelledMessage = typeof CoordinatorTaskCancelledMessage.Type;
