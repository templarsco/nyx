import { useCallback, useEffect, useState } from "react";
import { Bot, Clock, CheckCircle2, XCircle, Loader2, Ban, Link2, User } from "lucide-react";
import { cn } from "~/lib/utils";
import type { WorkerTask, WorkerStatus } from "~/coordinatorStore";

// ── Status config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  WorkerStatus,
  { label: string; icon: typeof Bot; dotClass: string; badgeClass: string; cardAccent: string }
> = {
  queued: {
    label: "Queued",
    icon: Clock,
    dotClass: "bg-gray-400",
    badgeClass: "bg-gray-500/10 text-gray-600 dark:bg-gray-400/16 dark:text-gray-400",
    cardAccent: "",
  },
  running: {
    label: "Running",
    icon: Loader2,
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/16 dark:text-emerald-400",
    cardAccent: "ring-1 ring-emerald-500/30",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:bg-blue-400/16 dark:text-blue-400",
    cardAccent: "",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    dotClass: "bg-red-500",
    badgeClass: "bg-red-500/10 text-red-700 dark:bg-red-400/16 dark:text-red-400",
    cardAccent: "ring-1 ring-red-500/30",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    dotClass: "bg-gray-400",
    badgeClass: "bg-gray-500/10 text-gray-500 dark:bg-gray-400/16 dark:text-gray-500",
    cardAccent: "opacity-60",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatElapsedTime(startedAt: number | null): string {
  if (startedAt === null) return "--";
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

// ── Component ────────────────────────────────────────────────────────

interface WorkerCardProps {
  worker: WorkerTask;
  className?: string;
}

export function WorkerCard({ worker, className }: WorkerCardProps) {
  const config = STATUS_CONFIG[worker.status];
  const StatusIcon = config.icon;
  const isRunning = worker.status === "running";

  // Live elapsed time ticker for running workers
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card text-card-foreground shadow-xs/5",
        "transition-all duration-200",
        config.cardAccent,
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-1.5">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            worker.status === "running"
              ? "bg-emerald-500/10"
              : worker.status === "completed"
                ? "bg-blue-500/10"
                : worker.status === "failed"
                  ? "bg-red-500/10"
                  : "bg-muted/60",
          )}
        >
          <StatusIcon
            className={cn(
              "size-3.5",
              worker.status === "running" && "animate-spin text-emerald-600 dark:text-emerald-400",
              worker.status === "completed" && "text-blue-600 dark:text-blue-400",
              worker.status === "failed" && "text-red-600 dark:text-red-400",
              worker.status === "queued" && "text-muted-foreground",
              worker.status === "cancelled" && "text-muted-foreground",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-[0.625rem] font-medium leading-none",
              config.badgeClass,
            )}
          >
            <span className={cn("size-1.5 rounded-full", config.dotClass)} />
            {config.label}
          </span>
        </div>
      </div>

      {/* Task description */}
      <div className="px-3.5 py-1.5">
        <p className="line-clamp-2 text-xs leading-relaxed text-foreground/80">
          {worker.description}
        </p>
      </div>

      {/* Assigned teammate */}
      <div className="flex items-center gap-1.5 px-3.5 py-1">
        <User className="size-3 text-muted-foreground" />
        <span className="text-[0.6875rem] text-muted-foreground">
          {worker.assignedTo ?? "Unassigned"}
        </span>
      </div>

      {/* Dependencies */}
      {worker.dependencies.length > 0 && (
        <div className="flex items-center gap-1.5 px-3.5 py-1">
          <Link2 className="size-3 text-muted-foreground" />
          <span className="text-[0.6875rem] text-muted-foreground">
            {worker.dependencies.length} dep{worker.dependencies.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Result or error preview */}
      {(worker.result || worker.error) && (
        <div className="mx-3.5 my-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5">
          <pre
            className={cn(
              "line-clamp-3 whitespace-pre-wrap font-mono text-[0.625rem] leading-relaxed",
              worker.error ? "text-red-700 dark:text-red-400" : "text-muted-foreground",
            )}
          >
            {worker.error ?? worker.result}
          </pre>
        </div>
      )}

      {/* Footer: elapsed time */}
      <div className="mt-auto flex items-center border-t border-border/50 px-3.5 py-2">
        <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
          <Clock className="size-3" />
          {worker.completedAt !== null && worker.startedAt !== null
            ? formatElapsedTime(worker.startedAt)
            : isRunning
              ? formatElapsedTime(worker.startedAt)
              : "--"}
        </span>
      </div>
    </div>
  );
}
