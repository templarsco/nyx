import { Schema } from "effect";
import { ThreadId } from "./baseSchemas";

/** Branded identifier for notifications */
const makeEntityId = (brand: string) =>
  Schema.Trim.check(Schema.isNonEmpty()).pipe(Schema.brand(brand));

export const NotificationId = makeEntityId("NotificationId");
export type NotificationId = typeof NotificationId.Type;

export const TeammateId = makeEntityId("TeammateId");
export type TeammateId = typeof TeammateId.Type;

/**
 * Notification types emitted by agents or the system.
 */
export const NotificationType = Schema.Literal(
  "input_needed",
  "warning",
  "error",
  "completed",
  "info",
);
export type NotificationType = typeof NotificationType.Type;

/**
 * Ring visual state for sidebar thread indicators.
 */
export const RingState = Schema.Literal("input", "warning", "completed");
export type RingState = typeof RingState.Type;

/**
 * Notification mode: full (rings + toasts + panel) or simple (rings + badge).
 */
export const NotificationMode = Schema.Literal("full", "simple");
export type NotificationMode = typeof NotificationMode.Type;

/**
 * A notification pushed from server to client.
 */
export const Notification = Schema.Struct({
  id: NotificationId,
  agentId: Schema.NullOr(TeammateId),
  threadId: Schema.NullOr(ThreadId),
  type: NotificationType,
  message: Schema.String,
  timestamp: Schema.Number,
  read: Schema.Boolean,
  dismissed: Schema.Boolean,
});
export type Notification = typeof Notification.Type;

/**
 * WebSocket push message for notifications.
 */
export const NotificationPushMessage = Schema.Struct({
  channel: Schema.Literal("notification.push"),
  payload: Schema.Struct({
    id: NotificationId,
    agentId: Schema.NullOr(TeammateId),
    threadId: Schema.NullOr(ThreadId),
    type: NotificationType,
    message: Schema.String,
    priority: Schema.Literal("low", "normal", "high"),
  }),
});
export type NotificationPushMessage = typeof NotificationPushMessage.Type;
