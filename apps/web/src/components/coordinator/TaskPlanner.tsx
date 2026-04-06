import { useCallback, useState } from "react";
import { Sparkles, Play, Loader2, GitFork, Clock, Cpu } from "lucide-react";
import { cn } from "~/lib/utils";
import { useCoordinatorStore } from "~/coordinatorStore";

// ── Component ────────────────────────────────────────────────────────

interface TaskPlannerProps {
  className?: string;
}

export function TaskPlanner({ className }: TaskPlannerProps) {
  const [description, setDescription] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [planned, setPlanned] = useState(false);

  const currentTask = useCoordinatorStore((s) => s.currentTask);
  const startTask = useCoordinatorStore((s) => s.startTask);
  const addSubtask = useCoordinatorStore((s) => s.addSubtask);
  const setPhase = useCoordinatorStore((s) => s.setPhase);
  const maxParallelWorkers = useCoordinatorStore((s) => s.maxParallelWorkers);

  const hasActiveTask = currentTask !== null;

  const handlePlan = useCallback(() => {
    const trimmed = description.trim();
    if (trimmed.length === 0) return;

    setIsPlanning(true);

    // Start the task in planning phase
    startTask(trimmed);

    // Simulate planning delay (in production, the backend would decompose)
    setTimeout(() => {
      setIsPlanning(false);
      setPlanned(true);
    }, 600);
  }, [description, startTask]);

  const handleExecute = useCallback(() => {
    if (currentTask === null) return;
    setPhase(currentTask.id, "researching");
    setPlanned(false);
    setDescription("");
  }, [currentTask, setPhase]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (planned) {
          handleExecute();
        } else if (!isPlanning && !hasActiveTask) {
          handlePlan();
        }
      }
    },
    [planned, isPlanning, hasActiveTask, handlePlan, handleExecute],
  );

  const subtasks = currentTask?.subtasks ?? [];
  const estimatedTime =
    subtasks.length > 0 ? `~${Math.ceil(subtasks.length / maxParallelWorkers) * 2}m` : null;

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs/5", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Task Planner</span>
      </div>

      {/* Text input */}
      <div className="relative">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasActiveTask && !planned
              ? "A task is already running..."
              : "Describe what you want to accomplish..."
          }
          disabled={isPlanning || (hasActiveTask && !planned)}
          rows={3}
          className={cn(
            "w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5",
            "text-sm text-foreground placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors",
          )}
        />
      </div>

      {/* Plan button / Execute button */}
      <div className="flex items-center gap-2">
        {!planned ? (
          <button
            type="button"
            onClick={handlePlan}
            disabled={description.trim().length === 0 || isPlanning || (hasActiveTask && !planned)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium",
              "bg-primary text-primary-foreground",
              "transition-colors hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            )}
          >
            {isPlanning ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Planning...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Plan
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleExecute}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium",
              "bg-emerald-600 text-white",
              "transition-colors hover:bg-emerald-700",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            )}
          >
            <Play className="size-3.5" />
            Execute
          </button>
        )}

        {/* Estimation chips */}
        {planned && subtasks.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-[0.6875rem] text-muted-foreground">
              <GitFork className="size-3" />
              {subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-[0.6875rem] text-muted-foreground">
              <Cpu className="size-3" />
              {maxParallelWorkers} workers
            </span>
            {estimatedTime && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-[0.6875rem] text-muted-foreground">
                <Clock className="size-3" />
                {estimatedTime}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Decomposed subtask preview (when planned) */}
      {planned && subtasks.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Decomposed Subtasks
          </h4>
          <div className="flex flex-col gap-1.5">
            {subtasks.map((subtask, index) => (
              <div key={subtask.id} className="flex items-start gap-2 text-[0.6875rem]">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-primary/10 text-[0.5625rem] font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="text-foreground/80">{subtask.description}</span>
                {subtask.dependencies.length > 0 && (
                  <span className="ml-auto shrink-0 text-muted-foreground/60">
                    depends on {subtask.dependencies.length}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
