import { useCallback } from "react";
import {
  Bot,
  GitBranch,
  GitPullRequest,
  Clock,
  File,
  MessageSquare,
  Play,
  X,
  SkipForward,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { Teammate, TeammateStatus } from "~/teamsStore";

// ── Status config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TeammateStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  idle: {
    label: "Idle",
    dotClass: "bg-gray-400",
    badgeClass: "bg-gray-500/10 text-gray-600 dark:bg-gray-400/16 dark:text-gray-400",
  },
  coding: {
    label: "Coding",
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/16 dark:text-emerald-400",
  },
  waiting: {
    label: "Waiting",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/16 dark:text-amber-400",
  },
  error: {
    label: "Error",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-500/10 text-red-700 dark:bg-red-400/16 dark:text-red-400",
  },
  completed: {
    label: "Completed",
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:bg-blue-400/16 dark:text-blue-400",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatElapsedTime(startedAt: number): string {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatPrStatus(prStatus: Teammate["prStatus"]): string {
  if (prStatus === "merged") return "Merged";
  if (prStatus === "closed") return "Closed";
  return "Open";
}

// ── Component ────────────────────────────────────────────────────────

interface TeammateCardProps {
  teammate: Teammate;
  onReply?: (teammateId: string) => void;
  onApprove?: (teammateId: string) => void;
  onSkip?: (teammateId: string) => void;
  onRemove?: (teammateId: string) => void;
}

export function TeammateCard({
  teammate,
  onReply,
  onApprove,
  onSkip,
  onRemove,
}: TeammateCardProps) {
  const statusConfig = STATUS_CONFIG[teammate.status];
  const isWaiting = teammate.status === "waiting";

  const handleReply = useCallback(() => {
    onReply?.(teammate.id);
  }, [onReply, teammate.id]);

  const handleApprove = useCallback(() => {
    onApprove?.(teammate.id);
  }, [onApprove, teammate.id]);

  const handleSkip = useCallback(() => {
    onSkip?.(teammate.id);
  }, [onSkip, teammate.id]);

  const handleRemove = useCallback(() => {
    onRemove?.(teammate.id);
  }, [onRemove, teammate.id]);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        "transition-shadow duration-200",
        isWaiting && "ring-2 ring-blue-500/60 animate-[waiting-ring_2s_ease-in-out_infinite]",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{teammate.name}</span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-[0.625rem] font-medium leading-none",
                statusConfig.badgeClass,
              )}
            >
              <span className={cn("size-1.5 rounded-full", statusConfig.dotClass)} />
              {statusConfig.label}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{teammate.model}</span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Remove teammate"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Git info */}
      {(teammate.branch || teammate.prNumber !== null) && (
        <div className="flex items-center gap-3 px-4 py-1.5">
          {teammate.branch && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <GitBranch className="size-3" />
              <span className="max-w-[120px] truncate font-mono text-[0.6875rem]">
                {teammate.branch}
              </span>
            </span>
          )}
          {teammate.prNumber !== null && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <GitPullRequest className="size-3" />
              <span className="font-mono text-[0.6875rem]">#{teammate.prNumber}</span>
              {teammate.prStatus && (
                <span
                  className={cn(
                    "text-[0.5625rem] font-medium",
                    teammate.prStatus === "merged" && "text-primary",
                    teammate.prStatus === "open" && "text-emerald-600 dark:text-emerald-400",
                    teammate.prStatus === "closed" && "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatPrStatus(teammate.prStatus)}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Current task */}
      {teammate.currentTask && (
        <div className="px-4 py-1.5">
          <p className="line-clamp-2 text-xs leading-relaxed text-foreground/80">
            {teammate.currentTask}
          </p>
        </div>
      )}

      {/* Terminal output preview */}
      {teammate.outputPreview && (
        <div className="mx-4 my-1.5 rounded-lg bg-muted/60 px-3 py-2">
          <pre className="line-clamp-3 whitespace-pre-wrap font-mono text-[0.6875rem] leading-relaxed text-muted-foreground">
            {teammate.outputPreview}
          </pre>
        </div>
      )}

      {/* Footer stats + actions */}
      <div className="mt-auto flex items-center justify-between border-t border-border/50 px-4 py-2.5">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-[0.6875rem]">
            <Clock className="size-3" />
            {formatElapsedTime(teammate.startedAt)}
          </span>
          <span className="inline-flex items-center gap-1 text-[0.6875rem]">
            <File className="size-3" />
            {teammate.filesChanged}
          </span>
        </div>

        {isWaiting && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleReply}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.6875rem] font-medium text-foreground transition-colors hover:bg-accent"
              aria-label="Reply to teammate"
            >
              <MessageSquare className="size-3" />
              Reply
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.6875rem] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
              aria-label="Approve"
            >
              <Play className="size-3" />
              Approve
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:bg-accent"
              aria-label="Skip"
            >
              <SkipForward className="size-3" />
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
