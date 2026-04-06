import { useCallback, useEffect } from "react";
import { Bot } from "lucide-react";
import { cn } from "~/lib/utils";
import { useTeamsStore } from "~/teamsStore";

// ── Component ────────────────────────────────────────────────────────

interface TeamsToggleProps {
  className?: string;
}

export function TeamsToggle({ className }: TeamsToggleProps) {
  const viewMode = useTeamsStore((s) => s.viewMode);
  const teammates = useTeamsStore((s) => s.teammates);
  const setViewMode = useTeamsStore((s) => s.setViewMode);

  const activeCount = teammates.filter(
    (t) => t.status === "coding" || t.status === "waiting",
  ).length;

  const toggleMode = useCallback(() => {
    setViewMode(viewMode === "center" ? "split" : "center");
  }, [viewMode, setViewMode]);

  // Keyboard shortcut: Ctrl+Shift+T
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        toggleMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleMode]);

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5",
        "text-xs font-medium text-muted-foreground shadow-xs/5",
        "transition-colors hover:bg-accent hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={`Switch to ${viewMode === "center" ? "split" : "command center"} view`}
    >
      <Bot className="size-3.5 text-primary" />
      <span>{viewMode === "center" ? "Split" : "Center"}</span>
      {activeCount > 0 && (
        <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/10 text-[0.5625rem] font-semibold text-primary">
          {activeCount}
        </span>
      )}
      <kbd className="hidden items-center gap-0.5 rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[0.5625rem] text-muted-foreground/60 sm:inline-flex">
        Ctrl+Shift+T
      </kbd>
    </button>
  );
}
