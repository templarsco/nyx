import { useMemo } from "react";
import { Bot, Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import { useTeamsStore } from "~/teamsStore";
import type { Teammate, TeammateStatus } from "~/teamsStore";
import { TeamsToggle } from "./TeamsToggle";

// ── Status styling ───────────────────────────────────────────────────

const STATUS_CLASSES: Record<TeammateStatus, string> = {
  idle: "text-gray-500",
  coding: "text-emerald-600 dark:text-emerald-400",
  waiting: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
  completed: "text-blue-600 dark:text-blue-400",
};

const STATUS_DOT_CLASSES: Record<TeammateStatus, string> = {
  idle: "bg-gray-400",
  coding: "bg-emerald-500",
  waiting: "bg-amber-500",
  error: "bg-red-500",
  completed: "bg-blue-500",
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatElapsedCompact(startedAt: number): string {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function capitalizeStatus(status: TeammateStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ── Pane component ───────────────────────────────────────────────────

interface SplitPaneProps {
  teammate: Teammate;
  className?: string;
}

function SplitPane({ teammate, className }: SplitPaneProps) {
  const isWaiting = teammate.status === "waiting";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card",
        "transition-shadow duration-200",
        isWaiting && "ring-2 ring-blue-500/60 animate-[waiting-ring_2s_ease-in-out_infinite]",
        className,
      )}
    >
      {/* Pane header */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border/50 px-3 py-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Bot className="size-3 text-primary" />
        </div>
        <span className="truncate text-xs font-semibold text-foreground">
          {teammate.name}
        </span>
        <div className="flex items-center gap-1">
          <span
            className={cn("size-1.5 rounded-full", STATUS_DOT_CLASSES[teammate.status])}
          />
          <span
            className={cn(
              "text-[0.625rem] font-medium",
              STATUS_CLASSES[teammate.status],
            )}
          >
            {capitalizeStatus(teammate.status)}
          </span>
        </div>
        <span className="ml-auto inline-flex items-center gap-0.5 text-[0.625rem] text-muted-foreground/60">
          <Clock className="size-2.5" />
          {formatElapsedCompact(teammate.startedAt)}
        </span>
      </div>

      {/* Pane body: chat thread placeholder */}
      <div className="flex flex-1 flex-col overflow-y-auto p-3">
        {teammate.currentTask && (
          <div className="mb-3 rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-xs leading-relaxed text-foreground/80">
              {teammate.currentTask}
            </p>
          </div>
        )}

        {teammate.outputPreview ? (
          <div className="mt-auto rounded-lg bg-muted/60 px-3 py-2">
            <pre className="whitespace-pre-wrap font-mono text-[0.6875rem] leading-relaxed text-muted-foreground">
              {teammate.outputPreview}
            </pre>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground/50">
            Thread content for {teammate.name}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

interface TeamsSplitViewProps {
  className?: string;
}

export function TeamsSplitView({ className }: TeamsSplitViewProps) {
  const teammates = useTeamsStore((s) => s.teammates);

  const activeTeammates = useMemo(
    () =>
      teammates.filter(
        (t) =>
          t.status === "coding" ||
          t.status === "waiting" ||
          t.status === "idle",
      ),
    [teammates],
  );

  // Determine layout: 1 pane = full, 2 = horizontal halves, 3+ = grid
  const layoutClass = useMemo(() => {
    if (activeTeammates.length <= 1) return "grid-cols-1";
    if (activeTeammates.length === 2) return "grid-cols-2";
    if (activeTeammates.length <= 4) return "grid-cols-2 grid-rows-2";
    return "grid-cols-3 grid-rows-2";
  }, [activeTeammates.length]);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-foreground">Split View</h2>
          <span className="text-xs text-muted-foreground">
            {activeTeammates.length} active
          </span>
        </div>
        <TeamsToggle />
      </div>

      {/* Split panes */}
      {activeTeammates.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No active teammates. Switch to Command Center to spawn agents.
        </div>
      ) : (
        <div className={cn("grid flex-1 gap-2 overflow-hidden p-2", layoutClass)}>
          {activeTeammates.map((teammate) => (
            <SplitPane key={teammate.id} teammate={teammate} />
          ))}
        </div>
      )}
    </div>
  );
}
