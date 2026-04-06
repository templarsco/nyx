import { useCallback } from "react";
import { Plus } from "lucide-react";
import { cn } from "~/lib/utils";
import { useTeamsStore } from "~/teamsStore";
import { TeammateCard } from "./TeammateCard";
import { ActivityFeed } from "./ActivityFeed";
import { TeamsToggle } from "./TeamsToggle";

// ── Component ────────────────────────────────────────────────────────

interface TeamsCommandCenterProps {
  onSpawnAgent?: () => void;
  onReplyToTeammate?: (teammateId: string) => void;
  onApproveTeammate?: (teammateId: string) => void;
  onSkipTeammate?: (teammateId: string) => void;
  className?: string;
}

export function TeamsCommandCenter({
  onSpawnAgent,
  onReplyToTeammate,
  onApproveTeammate,
  onSkipTeammate,
  className,
}: TeamsCommandCenterProps) {
  const teammates = useTeamsStore((s) => s.teammates);
  const activityFeed = useTeamsStore((s) => s.activityFeed);
  const removeTeammate = useTeamsStore((s) => s.removeTeammate);

  const handleRemove = useCallback(
    (teammateId: string) => {
      removeTeammate(teammateId);
    },
    [removeTeammate],
  );

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            Command Center
          </h2>
          <span className="text-xs text-muted-foreground">
            {teammates.length} agent{teammates.length !== 1 ? "s" : ""}
          </span>
        </div>
        <TeamsToggle />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Agent card grid */}
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {teammates.map((teammate) => (
              <TeammateCard
                key={teammate.id}
                teammate={teammate}
                onReply={onReplyToTeammate}
                onApprove={onApproveTeammate}
                onSkip={onSkipTeammate}
                onRemove={handleRemove}
              />
            ))}

            {/* Spawn agent card */}
            <button
              type="button"
              onClick={onSpawnAgent}
              className={cn(
                "group flex min-h-[140px] flex-col items-center justify-center gap-2",
                "rounded-2xl border-2 border-dashed border-border/60",
                "bg-transparent text-muted-foreground",
                "transition-colors hover:border-primary/40 hover:bg-primary/[0.03] hover:text-primary",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              )}
              aria-label="Spawn a new agent"
            >
              <div className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-muted/40 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                <Plus className="size-5" />
              </div>
              <span className="text-sm font-medium">Spawn Agent</span>
            </button>
          </div>
        </div>

        {/* Activity feed */}
        <div className="border-t border-border">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity
            </h3>
            {activityFeed.length > 0 && (
              <span className="text-[0.625rem] text-muted-foreground/60">
                {activityFeed.length} event{activityFeed.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <ActivityFeed entries={activityFeed} className="max-h-64 px-5 pb-4" />
        </div>
      </div>
    </div>
  );
}
