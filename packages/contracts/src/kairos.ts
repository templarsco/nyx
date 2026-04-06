import { Schema } from "effect";

// ── Identifiers ─────────────────────────────────────────────────────

const makeEntityId = (brand: string) =>
  Schema.Trim.check(Schema.isNonEmpty()).pipe(Schema.brand(brand));

export const KairosObservationId = makeEntityId("KairosObservationId");
export type KairosObservationId = typeof KairosObservationId.Type;

export const KairosSuggestionId = makeEntityId("KairosSuggestionId");
export type KairosSuggestionId = typeof KairosSuggestionId.Type;

// ── Status ──────────────────────────────────────────────────────────

export const KairosStatus = Schema.Literals(["sleeping", "observing", "acting", "paused"]);
export type KairosStatus = typeof KairosStatus.Type;

// ── Observation ─────────────────────────────────────────────────────

export const KairosObservationType = Schema.Literals([
  "terminal_output",
  "agent_status",
  "file_change",
  "error",
  "pattern",
]);
export type KairosObservationType = typeof KairosObservationType.Type;

export const KairosObservation = Schema.Struct({
  id: KairosObservationId,
  timestamp: Schema.Number,
  type: KairosObservationType,
  source: Schema.String,
  summary: Schema.String,
  data: Schema.Record(Schema.String, Schema.Unknown),
  acted: Schema.Boolean,
});
export type KairosObservation = typeof KairosObservation.Type;

// ── Suggestion ──────────────────────────────────────────────────────

export const KairosSuggestionType = Schema.Literals(["fix", "optimization", "reminder", "insight"]);
export type KairosSuggestionType = typeof KairosSuggestionType.Type;

export const KairosSuggestionPriority = Schema.Literals(["low", "normal", "high"]);
export type KairosSuggestionPriority = typeof KairosSuggestionPriority.Type;

export const KairosSuggestion = Schema.Struct({
  id: KairosSuggestionId,
  timestamp: Schema.Number,
  type: KairosSuggestionType,
  title: Schema.String,
  description: Schema.String,
  priority: KairosSuggestionPriority,
  dismissed: Schema.Boolean,
  applied: Schema.Boolean,
  estimatedDuration: Schema.Number,
});
export type KairosSuggestion = typeof KairosSuggestion.Type;

// ── WebSocket messages ──────────────────────────────────────────────

export const KairosTickMessage = Schema.Struct({
  channel: Schema.Literals(["kairos.tick"]),
  payload: Schema.Struct({
    tickNumber: Schema.Number,
    timestamp: Schema.Number,
    observationCount: Schema.Number,
    suggestionCount: Schema.Number,
  }),
});
export type KairosTickMessage = typeof KairosTickMessage.Type;

export const KairosSuggestionMessage = Schema.Struct({
  channel: Schema.Literals(["kairos.suggestion"]),
  payload: KairosSuggestion,
});
export type KairosSuggestionMessage = typeof KairosSuggestionMessage.Type;
