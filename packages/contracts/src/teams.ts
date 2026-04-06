import { Schema } from "effect";
import { TeammateId } from "./notification";
import { ThreadId } from "./baseSchemas";

/**
 * Status of a teammate agent.
 */
export const TeammateStatus = Schema.Literals(["idle", "coding", "waiting", "error", "completed"]);
export type TeammateStatus = typeof TeammateStatus.Type;

/**
 * View mode for the Teams UI.
 */
export const TeamsViewMode = Schema.Literals(["split", "center"]);
export type TeamsViewMode = typeof TeamsViewMode.Type;

/**
 * A teammate agent managed by the Teams system.
 */
export const Teammate = Schema.Struct({
  id: TeammateId,
  name: Schema.String,
  threadId: ThreadId,
  status: TeammateStatus,
  currentTask: Schema.NullOr(Schema.String),
  branch: Schema.NullOr(Schema.String),
  prNumber: Schema.NullOr(Schema.Number),
  prStatus: Schema.NullOr(Schema.Literals(["open", "merged", "closed"])),
  model: Schema.String,
  provider: Schema.String,
  activePorts: Schema.Array(Schema.Number),
  startedAt: Schema.Number,
  lastActivityAt: Schema.Number,
  filesChanged: Schema.Number,
  outputPreview: Schema.NullOr(Schema.String),
});
export type Teammate = typeof Teammate.Type;

/**
 * Activity feed entry type.
 */
export const ActivityEntryType = Schema.Literals([
  "started",
  "completed",
  "error",
  "waiting",
  "status_change",
]);
export type ActivityEntryType = typeof ActivityEntryType.Type;

/**
 * An entry in the teams activity feed.
 */
export const ActivityEntry = Schema.Struct({
  id: Schema.String,
  timestamp: Schema.Number,
  teammateId: TeammateId,
  teammateName: Schema.String,
  type: ActivityEntryType,
  message: Schema.String,
});
export type ActivityEntry = typeof ActivityEntry.Type;

/**
 * WebSocket messages for team management.
 */
export const TeammateSpawnedMessage = Schema.Struct({
  channel: Schema.Literals(["teams.teammate.spawned"]),
  payload: Teammate,
});
export type TeammateSpawnedMessage = typeof TeammateSpawnedMessage.Type;

export const TeammateStatusUpdateMessage = Schema.Struct({
  channel: Schema.Literals(["teams.teammate.status"]),
  payload: Schema.Struct({
    teammateId: TeammateId,
    status: TeammateStatus,
    currentTask: Schema.NullOr(Schema.String),
    outputPreview: Schema.NullOr(Schema.String),
  }),
});
export type TeammateStatusUpdateMessage = typeof TeammateStatusUpdateMessage.Type;
