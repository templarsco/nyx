import { useCallback } from "react";
import {
  Eye,
  EyeOff,
  Zap,
  Moon,
  Brain,
  AlertCircle,
  Check,
  X,
  Clock,
  Activity,
  Trash2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useKairosStore } from "~/kairosStore";
import type { KairosStatus, KairosSuggestion } from "~/kairosStore";

// ── Status display config ────────────────────────────────────────────

const STATUS_DISPLAY: Record<
  KairosStatus,
  { label: string; Icon: typeof Eye; dotClass: string; description: string }
> = {
  sleeping: {
    label: "Sleeping",
    Icon: Moon,
    dotClass: "bg-gray-400",
    description: "KAIROS is inactive",
  },
  observing: {
    label: "Observing",
    Icon: Eye,
    dotClass: "bg-emerald-500 animate-pulse",
    description: "Watching for patterns...",
  },
  acting: {
    label: "Acting",
    Icon: Zap,
    dotClass: "bg-amber-500 animate-pulse",
    description: "Processing a suggestion",
  },
  paused: {
    label: "Paused",
    Icon: EyeOff,
    dotClass: "bg-gray-400",
    description: "Paused while tab is hidden",
  },
};

const PRIORITY_CONFIG: Record<KairosSuggestion["priority"], { label: string; badgeClass: string }> =
  {
    low: {
      label: "Low",
      badgeClass: "bg-gray-500/10 text-gray-600 dark:bg-gray-400/16 dark:text-gray-400",
    },
    normal: {
      label: "Normal",
      badgeClass: "bg-blue-500/10 text-blue-700 dark:bg-blue-400/16 dark:text-blue-400",
    },
    high: {
      label: "High",
      badgeClass: "bg-red-500/10 text-red-700 dark:bg-red-400/16 dark:text-red-400",
    },
  };

const TYPE_ICON: Record<KairosSuggestion["type"], typeof Brain> = {
  fix: AlertCircle,
  optimization: Zap,
  reminder: Clock,
  insight: Brain,
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// ── Tick interval presets ────────────────────────────────────────────

const TICK_PRESETS = [
  { label: "10s", value: 10_000 },
  { label: "30s", value: 30_000 },
  { label: "1m", value: 60_000 },
  { label: "5m", value: 300_000 },
] as const;

// ── Suggestion Card ──────────────────────────────────────────────────

interface SuggestionCardProps {
  suggestion: KairosSuggestion;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
}

function SuggestionCard({ suggestion, onApply, onDismiss }: SuggestionCardProps) {
  const priorityConfig = PRIORITY_CONFIG[suggestion.priority];
  const TypeIcon = TYPE_ICON[suggestion.type];
  const isDeferred = suggestion.estimatedDuration > 15;

  const handleApply = useCallback(() => {
    onApply(suggestion.id);
  }, [onApply, suggestion.id]);

  const handleDismiss = useCallback(() => {
    onDismiss(suggestion.id);
  }, [onDismiss, suggestion.id]);

  return (
    <div
      className={cn(
        "group rounded-lg border border-border/50 bg-card/50 p-3",
        "transition-colors hover:border-border hover:bg-card",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <TypeIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-foreground">{suggestion.title}</span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-sm px-1 py-0.5 text-[0.5625rem] font-medium leading-none",
                priorityConfig.badgeClass,
              )}
            >
              {priorityConfig.label}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[0.6875rem] leading-relaxed text-muted-foreground">
            {suggestion.description}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-flex items-center gap-0.5 text-[0.625rem]">
            <Clock className="size-2.5" />
            {formatDuration(suggestion.estimatedDuration)}
          </span>
          {isDeferred && (
            <span className="text-[0.625rem] text-amber-600 dark:text-amber-400">Deferred</span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleApply}
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
              "text-[0.625rem] font-medium text-emerald-700 dark:text-emerald-400",
              "transition-colors hover:bg-emerald-500/10",
            )}
            aria-label={`Apply: ${suggestion.title}`}
          >
            <Check className="size-2.5" />
            Apply
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
              "text-[0.625rem] font-medium text-muted-foreground",
              "transition-colors hover:bg-accent",
            )}
            aria-label={`Dismiss: ${suggestion.title}`}
          >
            <X className="size-2.5" />
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KairosPanel ──────────────────────────────────────────────────────

interface KairosPanelProps {
  className?: string;
  onClose?: () => void;
}

export function KairosPanel({ className, onClose }: KairosPanelProps) {
  const status = useKairosStore((s) => s.status);
  const enabled = useKairosStore((s) => s.enabled);
  const tickIntervalMs = useKairosStore((s) => s.tickIntervalMs);
  const observations = useKairosStore((s) => s.observations);
  const suggestions = useKairosStore((s) => s.suggestions);
  const lastTickAt = useKairosStore((s) => s.lastTickAt);
  const totalTicks = useKairosStore((s) => s.totalTicks);
  const totalActions = useKairosStore((s) => s.totalActions);

  const storeSetEnabled = useKairosStore((s) => s.setEnabled);
  const storeSetTickInterval = useKairosStore((s) => s.setTickInterval);
  const storeDismissSuggestion = useKairosStore((s) => s.dismissSuggestion);
  const storeApplySuggestion = useKairosStore((s) => s.applySuggestion);
  const storeClearObservations = useKairosStore((s) => s.clearObservations);

  const statusConfig = STATUS_DISPLAY[status];
  const StatusIcon = statusConfig.Icon;

  const activeSuggestions = suggestions.filter((s) => !s.dismissed && !s.applied);

  const handleToggleEnabled = useCallback(() => {
    storeSetEnabled(!enabled);
  }, [enabled, storeSetEnabled]);

  const handleApply = useCallback(
    (id: string) => {
      storeApplySuggestion(id);
    },
    [storeApplySuggestion],
  );

  const handleDismiss = useCallback(
    (id: string) => {
      storeDismissSuggestion(id);
    },
    [storeDismissSuggestion],
  );

  const handleClearObservations = useCallback(() => {
    storeClearObservations();
  }, [storeClearObservations]);

  return (
    <div
      className={cn(
        "flex w-80 flex-col rounded-2xl border border-border/60 bg-card shadow-lg",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 size-2 rounded-full",
                statusConfig.dotClass,
              )}
              aria-hidden="true"
            />
            <Brain className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">KAIROS</h2>
            <p className="text-[0.625rem] text-muted-foreground">{statusConfig.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Enable/disable toggle */}
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              enabled ? "bg-primary" : "bg-muted",
            )}
            role="switch"
            aria-checked={enabled}
            aria-label="Enable KAIROS"
          >
            <span
              className={cn(
                "inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform",
                enabled ? "translate-x-4" : "translate-x-0.5",
              )}
            />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close KAIROS panel"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-2">
        <div className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
          <Activity className="size-2.5" />
          <span>{totalTicks} ticks</span>
        </div>
        <div className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
          <Zap className="size-2.5" />
          <span>{totalActions} actions</span>
        </div>
        <div className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
          <Eye className="size-2.5" />
          <span>{observations.length} obs</span>
        </div>
        {lastTickAt && (
          <span className="ml-auto text-[0.5625rem] text-muted-foreground/60">
            Last tick {formatTimeAgo(lastTickAt)}
          </span>
        )}
      </div>

      {/* Tick interval selector */}
      <div className="flex items-center gap-2 border-b border-border/30 px-4 py-2">
        <span className="text-[0.625rem] font-medium text-muted-foreground">Interval:</span>
        <div className="flex items-center gap-1">
          {TICK_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => storeSetTickInterval(preset.value)}
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[0.5625rem] font-medium transition-colors",
                tickIntervalMs === preset.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {activeSuggestions.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Suggestions ({activeSuggestions.length})
              </span>
            </div>
            {activeSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={handleApply}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <StatusIcon className="mb-2 size-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              {enabled
                ? "No suggestions yet. KAIROS is watching..."
                : "Enable KAIROS to start observing."}
            </p>
          </div>
        )}
      </div>

      {/* Footer: observation controls */}
      {observations.length > 0 && (
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-2">
          <span className="text-[0.625rem] text-muted-foreground">
            {observations.length} observations recorded
          </span>
          <button
            type="button"
            onClick={handleClearObservations}
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
              "text-[0.625rem] font-medium text-muted-foreground",
              "transition-colors hover:bg-accent hover:text-foreground",
            )}
            aria-label="Clear observations"
          >
            <Trash2 className="size-2.5" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
