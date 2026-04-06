/**
 * KAIROS Engine — headless React component that runs the tick loop.
 *
 * Renders nothing visible. Drives the KAIROS observation/suggestion cycle
 * by running a setInterval at the configured tick rate. Pauses when the
 * browser tab is hidden and resumes when it regains focus.
 *
 * On each tick the engine:
 * 1. Records the tick in the store
 * 2. Scans recent observations for actionable patterns
 * 3. Creates suggestions for patterns that fit within the 15s budget
 * 4. Appends a summary to the daily log
 */

import { useEffect, useRef } from "react";
import { useKairosStore } from "~/kairosStore";
import type { KairosObservation, KairosSuggestion } from "~/kairosStore";

// ── Pattern detection ────────────────────────────────────────────────

interface DetectedPattern {
  type: KairosSuggestion["type"];
  title: string;
  description: string;
  priority: KairosSuggestion["priority"];
  estimatedDuration: number;
}

/**
 * Analyze recent observations and detect actionable patterns.
 * Returns a list of suggestions to surface to the user.
 */
function detectPatterns(observations: KairosObservation[], budgetMs: number): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const budgetSeconds = budgetMs / 1000;

  // Only look at observations from the last 5 minutes that haven't been acted on
  const cutoff = Date.now() - 5 * 60 * 1000;
  const recent = observations.filter((o) => o.timestamp >= cutoff && !o.acted);

  if (recent.length === 0) return patterns;

  // ── Pattern: repeated errors from the same source ─────────────────
  const errorObs = recent.filter((o) => o.type === "error");
  const errorsBySource = new Map<string, KairosObservation[]>();
  for (const obs of errorObs) {
    const existing = errorsBySource.get(obs.source) ?? [];
    existing.push(obs);
    errorsBySource.set(obs.source, existing);
  }
  for (const [source, errors] of errorsBySource) {
    if (errors.length >= 3) {
      patterns.push({
        type: "fix",
        title: `Repeated errors from ${source}`,
        description: `${errors.length} errors detected from "${source}" in the last 5 minutes. The latest: "${errors[errors.length - 1]?.summary ?? "unknown"}"`,
        priority: "high",
        estimatedDuration: Math.min(10, budgetSeconds),
      });
    }
  }

  // ── Pattern: agent stuck (many observations, no status change) ────
  const agentObs = recent.filter((o) => o.type === "agent_status");
  const agentsBySource = new Map<string, KairosObservation[]>();
  for (const obs of agentObs) {
    const existing = agentsBySource.get(obs.source) ?? [];
    existing.push(obs);
    agentsBySource.set(obs.source, existing);
  }
  for (const [source, statuses] of agentsBySource) {
    if (statuses.length >= 5) {
      const uniqueStatuses = new Set(statuses.map((s) => s.summary));
      if (uniqueStatuses.size === 1) {
        patterns.push({
          type: "insight",
          title: `Agent "${source}" may be stuck`,
          description: `Agent has reported the same status "${statuses[0]?.summary ?? "unknown"}" ${statuses.length} times without change.`,
          priority: "normal",
          estimatedDuration: 5,
        });
      }
    }
  }

  // ── Pattern: high file churn ──────────────────────────────────────
  const fileObs = recent.filter((o) => o.type === "file_change");
  if (fileObs.length >= 10) {
    const uniqueFiles = new Set(fileObs.map((o) => o.source));
    if (uniqueFiles.size <= 3 && fileObs.length >= 10) {
      patterns.push({
        type: "optimization",
        title: "High file churn detected",
        description: `${fileObs.length} file changes across only ${uniqueFiles.size} file(s). Consider batching operations or investigating rapid rewrites.`,
        priority: "normal",
        estimatedDuration: 5,
      });
    }
  }

  // ── Pattern: terminal noise ───────────────────────────────────────
  const terminalObs = recent.filter((o) => o.type === "terminal_output");
  if (terminalObs.length >= 20) {
    patterns.push({
      type: "reminder",
      title: "High terminal output volume",
      description: `${terminalObs.length} terminal output events in the last 5 minutes. Consider filtering or redirecting verbose output.`,
      priority: "low",
      estimatedDuration: 3,
    });
  }

  return patterns;
}

// ── Engine component ─────────────────────────────────────────────────

export function KairosEngine() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasHiddenRef = useRef(false);

  const enabled = useKairosStore((s) => s.enabled);
  const tickIntervalMs = useKairosStore((s) => s.tickIntervalMs);
  const budgetMs = useKairosStore((s) => s.budgetMs);

  const recordTick = useKairosStore((s) => s.recordTick);
  const appendLog = useKairosStore((s) => s.appendLog);
  const addSuggestion = useKairosStore((s) => s.addSuggestion);
  const pause = useKairosStore((s) => s.pause);
  const resume = useKairosStore((s) => s.resume);

  // ── Tick handler ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    function tick() {
      const state = useKairosStore.getState();
      if (!state.enabled || state.status === "paused") return;

      // 1. Record the tick
      recordTick();

      // 2. Detect patterns in recent observations
      const patterns = detectPatterns(state.observations, state.budgetMs);

      // 3. Create suggestions for new patterns (avoid duplicates)
      const existingTitles = new Set(
        state.suggestions.filter((s) => !s.dismissed && !s.applied).map((s) => s.title),
      );

      for (const pattern of patterns) {
        if (!existingTitles.has(pattern.title)) {
          addSuggestion(pattern);
          existingTitles.add(pattern.title);
        }
      }

      // 4. Append to daily log
      const logSummary = [
        `Tick #${state.totalTicks + 1}`,
        `${state.observations.length} obs`,
        `${patterns.length} new patterns`,
      ].join(" | ");
      appendLog(logSummary);
    }

    // Clear any existing interval before creating a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(tick, tickIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, tickIntervalMs, budgetMs, recordTick, appendLog, addSuggestion, pause, resume]);

  // ── Visibility change handler (pause/resume) ─────────────────────
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        wasHiddenRef.current = true;
        pause();
        appendLog("Paused: tab hidden");
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        resume();
        appendLog("Resumed: tab visible");
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pause, resume, appendLog]);

  // Renders nothing — this is a headless engine component
  return null;
}
