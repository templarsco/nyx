import { useEffect, useRef } from "react";
import { cn } from "~/lib/utils";
import type { ActivityEntry, ActivityEntryType } from "~/teamsStore";

// ── Type styling ─────────────────────────────────────────────────────

const ENTRY_TYPE_CONFIG: Record<
  ActivityEntryType,
  { dotClass: string; nameClass: string }
> = {
  started: {
    dotClass: "bg-blue-500",
    nameClass: "text-blue-700 dark:text-blue-400",
  },
  completed: {
    dotClass: "bg-emerald-500",
    nameClass: "text-emerald-700 dark:text-emerald-400",
  },
  error: {
    dotClass: "bg-red-500",
    nameClass: "text-red-700 dark:text-red-400",
  },
  waiting: {
    dotClass: "bg-amber-500",
    nameClass: "text-amber-700 dark:text-amber-400",
  },
  status_change: {
    dotClass: "bg-primary",
    nameClass: "text-primary",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// ── Component ────────────────────────────────────────────────────────

const MAX_VISIBLE_ENTRIES = 100;

interface ActivityFeedProps {
  entries: ActivityEntry[];
  className?: string;
}

export function ActivityFeed({ entries, className }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Track whether user has scrolled away from bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScroll.current = distanceFromBottom < 40;
  };

  // Auto-scroll to newest entries
  useEffect(() => {
    const el = scrollRef.current;
    if (el && shouldAutoScroll.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length]);

  const visibleEntries = entries.slice(-MAX_VISIBLE_ENTRIES);

  if (visibleEntries.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-sm text-muted-foreground", className)}>
        No activity yet. Spawn an agent to get started.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn("overflow-y-auto", className)}
    >
      <div className="relative pl-4">
        {/* Vertical timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

        {visibleEntries.map((entry) => {
          const config = ENTRY_TYPE_CONFIG[entry.type];
          return (
            <div key={entry.id} className="relative flex items-start gap-3 py-1.5">
              {/* Timeline dot */}
              <div
                className={cn(
                  "relative z-10 mt-1.5 size-1.5 shrink-0 rounded-full",
                  config.dotClass,
                )}
              />
              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 text-[0.6875rem] leading-relaxed">
                  <span className="shrink-0 font-mono text-muted-foreground/60">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  <span className={cn("shrink-0 font-semibold", config.nameClass)}>
                    {entry.teammateName}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {entry.message}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
