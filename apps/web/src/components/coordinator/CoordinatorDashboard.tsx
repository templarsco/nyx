import { useCallback, useMemo } from "react";
import {
  Network,
  StopCircle,
  SlidersHorizontal,
  Minus,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useCoordinatorStore, type CoordinatorPhase } from "~/coordinatorStore";
import { WorkerCard } from "./WorkerCard";
import { TaskPlanner } from "./TaskPlanner";

// ── Phase config ────────────────────────────────────────────────────

const PHASE_STEPS: {
  key: CoordinatorPhase;
  label: string;
  icon: typeof Network;
}[] = [
  { key: "planning", label: "Planning", icon: Sparkles },
  { key: "researching", label: "Researching", icon: ListChecks },
  { key: "implementing", label: "Implementing", icon: Loader2 },
  { key: "verifying", label: "Verifying", icon: CheckCircle2 },
  { key: "synthesizing", label: "Synthesizing", icon: Network },
];

function phaseIndex(phase: CoordinatorPhase): number {
  const idx = PHASE_STEPS.findIndex((s) => s.key === phase);
  return idx >= 0 ? idx : -1;
}

// ── Phase progress bar ───────────────────────────────────────────────

function PhaseProgressBar({ phase }: { phase: CoordinatorPhase }) {
  const activeIdx = phaseIndex(phase);

  return (
    <div className="flex items-center gap-1">
      {PHASE_STEPS.map((step, idx) => {
        const StepIcon = step.icon;
        const isActive = idx === activeIdx;
        const isCompleted = activeIdx > idx;
        const isPending = idx > activeIdx;

        return (
          <div key={step.key} className="flex items-center gap-1">
            {idx > 0 && (
              <div
                className={cn(
                  "h-px w-4 transition-colors duration-300",
                  isCompleted ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.6875rem] font-medium transition-all duration-300",
                isActive && "bg-primary/10 text-primary",
                isCompleted && "text-primary/70",
                isPending && "text-muted-foreground/40",
              )}
            >
              <StepIcon
                className={cn("size-3", isActive && step.key === "implementing" && "animate-spin")}
              />
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Subtask progress summary ─────────────────────────────────────────

function SubtaskProgressSummary() {
  const progress = useCoordinatorStore((s) => s.taskProgress);
  const { total, done, percent } = progress();

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-[0.6875rem] font-medium text-muted-foreground">
        {done}/{total}
      </span>
    </div>
  );
}

// ── Parallelism slider ───────────────────────────────────────────────

function ParallelismControl() {
  const max = useCoordinatorStore((s) => s.maxParallelWorkers);
  const setMax = useCoordinatorStore((s) => s.setMaxParallelWorkers);

  const decrement = useCallback(() => setMax(max - 1), [max, setMax]);
  const increment = useCallback(() => setMax(max + 1), [max, setMax]);

  return (
    <div className="flex items-center gap-2">
      <SlidersHorizontal className="size-3.5 text-muted-foreground" />
      <span className="text-[0.6875rem] text-muted-foreground">Workers:</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={decrement}
          disabled={max <= 1}
          className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          aria-label="Decrease max workers"
        >
          <Minus className="size-3" />
        </button>
        <span className="min-w-[1.25rem] text-center text-xs font-semibold text-foreground">
          {max}
        </span>
        <button
          type="button"
          onClick={increment}
          disabled={max >= 10}
          className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          aria-label="Increase max workers"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────

interface CoordinatorDashboardProps {
  className?: string;
}

export function CoordinatorDashboard({ className }: CoordinatorDashboardProps) {
  const currentTask = useCoordinatorStore((s) => s.currentTask);
  const cancelTask = useCoordinatorStore((s) => s.cancelTask);
  const taskHistory = useCoordinatorStore((s) => s.taskHistory);

  const handleCancel = useCallback(() => {
    if (currentTask === null) return;
    cancelTask(currentTask.id);
  }, [currentTask, cancelTask]);

  const subtasks = currentTask?.subtasks ?? [];

  // Summary counters
  const summary = useMemo(() => {
    const running = subtasks.filter((w) => w.status === "running").length;
    const queued = subtasks.filter((w) => w.status === "queued").length;
    const completed = subtasks.filter((w) => w.status === "completed").length;
    const failed = subtasks.filter((w) => w.status === "failed").length;
    return { running, queued, completed, failed };
  }, [subtasks]);

  // Last completed task with synthesis
  const lastSynthesis = useMemo(() => {
    const last = taskHistory.at(-1);
    return last?.synthesisResult ?? null;
  }, [taskHistory]);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Network className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Coordinator</h2>
          {currentTask && (
            <span className="text-xs text-muted-foreground">
              {subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ParallelismControl />
          {currentTask && (
            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[0.6875rem] font-medium",
                "text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-400",
              )}
              aria-label="Cancel current task"
            >
              <StopCircle className="size-3" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Task planner (always visible when no active task) */}
        {currentTask === null && (
          <div className="p-5">
            <TaskPlanner />
          </div>
        )}

        {/* Active task section */}
        {currentTask && (
          <div className="flex flex-col gap-4 p-5">
            {/* Task description */}
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm text-foreground">{currentTask.description}</p>
            </div>

            {/* Phase indicator */}
            <PhaseProgressBar phase={currentTask.phase} />

            {/* Progress bar */}
            <SubtaskProgressSummary />

            {/* Summary counters */}
            {subtasks.length > 0 && (
              <div className="flex items-center gap-4">
                {summary.running > 0 && (
                  <span className="inline-flex items-center gap-1 text-[0.6875rem] text-emerald-700 dark:text-emerald-400">
                    <Loader2 className="size-3 animate-spin" />
                    {summary.running} running
                  </span>
                )}
                {summary.queued > 0 && (
                  <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
                    <Clock className="size-3" />
                    {summary.queued} queued
                  </span>
                )}
                {summary.completed > 0 && (
                  <span className="inline-flex items-center gap-1 text-[0.6875rem] text-blue-700 dark:text-blue-400">
                    <CheckCircle2 className="size-3" />
                    {summary.completed} done
                  </span>
                )}
                {summary.failed > 0 && (
                  <span className="inline-flex items-center gap-1 text-[0.6875rem] text-red-700 dark:text-red-400">
                    <XCircle className="size-3" />
                    {summary.failed} failed
                  </span>
                )}
              </div>
            )}

            {/* Worker cards grid */}
            {subtasks.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {subtasks.map((worker) => (
                  <WorkerCard key={worker.id} worker={worker} />
                ))}
              </div>
            )}

            {/* Empty subtask state */}
            {subtasks.length === 0 && currentTask.phase === "planning" && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Sparkles className="size-8 opacity-40" />
                <span className="text-sm">Decomposing task into subtasks...</span>
              </div>
            )}
          </div>
        )}

        {/* Synthesis result panel */}
        {currentTask === null && lastSynthesis && (
          <div className="border-t border-border p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last Synthesis
            </h3>
            <div className="rounded-xl border bg-muted/30 p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
                {lastSynthesis}
              </pre>
            </div>
          </div>
        )}

        {/* Task history */}
        {currentTask === null && taskHistory.length > 0 && (
          <div className="border-t border-border p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              History
            </h3>
            <div className="flex flex-col gap-2">
              {taskHistory
                .slice()
                .reverse()
                .slice(0, 10)
                .map((task) => {
                  const total = task.subtasks.length;
                  const completed = task.subtasks.filter((w) => w.status === "completed").length;
                  const failed = task.subtasks.filter((w) => w.status === "failed").length;
                  const wasCancelled = task.subtasks.some((w) => w.status === "cancelled");

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-3.5 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-foreground/80">{task.description}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[0.625rem] text-muted-foreground">
                          <span>{total} subtasks</span>
                          {completed > 0 && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {completed} done
                            </span>
                          )}
                          {failed > 0 && (
                            <span className="text-red-600 dark:text-red-400">{failed} failed</span>
                          )}
                          {wasCancelled && <span className="text-gray-500">cancelled</span>}
                        </div>
                      </div>
                      {task.completedAt && (
                        <span className="shrink-0 text-[0.625rem] text-muted-foreground/60">
                          {new Date(task.completedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Empty state — no task, no history */}
        {currentTask === null && taskHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-16">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/40">
              <Network className="size-7 text-muted-foreground/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground/70">No coordinated tasks yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use the planner above to decompose a high-level task into parallel subtasks.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
