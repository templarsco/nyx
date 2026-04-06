import { useCallback } from "react";
import { Eye, EyeOff, Zap, Moon } from "lucide-react";
import { cn } from "~/lib/utils";
import { useKairosStore } from "~/kairosStore";
import type { KairosStatus } from "~/kairosStore";

// ── Status config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  KairosStatus,
  { label: string; Icon: typeof Eye; iconClass: string; pulseClass: string }
> = {
  sleeping: {
    label: "Sleeping",
    Icon: Moon,
    iconClass: "text-muted-foreground",
    pulseClass: "",
  },
  observing: {
    label: "Observing",
    Icon: Eye,
    iconClass: "text-primary",
    pulseClass: "animate-pulse",
  },
  acting: {
    label: "Acting",
    Icon: Zap,
    iconClass: "text-amber-500 dark:text-amber-400",
    pulseClass: "animate-[ping_1s_ease-in-out_infinite]",
  },
  paused: {
    label: "Paused",
    Icon: EyeOff,
    iconClass: "text-muted-foreground/60",
    pulseClass: "",
  },
};

// ── Component ────────────────────────────────────────────────────────

interface KairosStatusIndicatorProps {
  className?: string;
  onClick?: () => void;
}

export function KairosStatusIndicator({ className, onClick }: KairosStatusIndicatorProps) {
  const status = useKairosStore((s) => s.status);
  const enabled = useKairosStore((s) => s.enabled);
  const observations = useKairosStore((s) => s.observations);
  const suggestions = useKairosStore((s) => s.suggestions);

  const activeSuggestionCount = suggestions.filter((s) => !s.dismissed && !s.applied).length;
  const observationCount = observations.length;

  const config = STATUS_CONFIG[status];
  const { Icon } = config;

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5",
        "text-xs font-medium text-muted-foreground shadow-xs/5",
        "transition-colors hover:bg-accent hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={`KAIROS: ${config.label}. ${observationCount} observations, ${activeSuggestionCount} suggestions.`}
    >
      {/* Pulse ring behind the icon when active */}
      {enabled && config.pulseClass && (
        <span
          className={cn(
            "absolute left-2 size-3.5 rounded-full opacity-20",
            status === "observing" && "bg-primary",
            status === "acting" && "bg-amber-500",
            config.pulseClass,
          )}
          aria-hidden="true"
        />
      )}

      <Icon className={cn("relative size-3.5", config.iconClass)} />

      <span className="hidden sm:inline">KAIROS</span>

      {/* Observation count badge */}
      {observationCount > 0 && (
        <span className="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[0.5625rem] font-semibold text-muted-foreground">
          {observationCount > 99 ? "99+" : observationCount}
        </span>
      )}

      {/* Active suggestion count badge */}
      {activeSuggestionCount > 0 && (
        <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/10 text-[0.5625rem] font-semibold text-primary">
          {activeSuggestionCount}
        </span>
      )}
    </button>
  );
}
